// <chant-editor>: a score that can be edited note by note.
//
//   <chant-editor line-breaks="ignore">(c4) Ky(f)ri(gh)e(h) (::)</chant-editor>
//
// It draws its gabc with <chant-visual> and lets the reader click the notes:
// a click selects a note, Shift+click a range, Ctrl/Cmd+click adds or removes
// one, a double click selects the whole neume. The keyboard moves the selection
// (← →, with Shift to extend it), raises and lowers the selected notes (↑ ↓),
// deletes them (Delete), clears the selection (Esc) and undoes (Ctrl/Cmd+Z,
// Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y to redo). Every change goes into the history.
//
// The page builds its own tools around it with the functions of
// Exsurge.Model: read `body` and `selection`, then call `editNotes()` or
// `apply()` with a new body. Each new version is laid out off-screen and
// swapped in when drawn, so the score never flashes empty while it is edited.
//
// Attributes:
//   readonly           shows the score without selection or editing
//   annotation         text over the initial (default: the mode from the header,
//                      in Roman numerals; annotation="" for none)
//   use-drop-cap       "false" for no large initial
//   line-breaks        "ignore" to drop the forced line breaks of the gabc
//   keyboard           "off" to leave the keyboard to the page
//
// Events (all bubble):
//   chant-change   detail { value }            after an edit, undo or redo
//   chant-select   detail { selected, focus }  when the selection changes (focus: the note
//                                              the tools should show, also `focusNote`)
//   chant-drawn    detail { aligned }          after each new version is drawn
//   chant-notice   detail { kind, kept }       kind "last-note": some notes were
//                                              not deleted, every syllable keeps one
//
// Colours come from CSS: --chant-select-color (default: the rubric colour) for
// the selection, --chant-mark-color for the notes marked with mark().

import {
  changedNotes, deleteNote, editNote, headerField, insertNoteAfter, movePitch, insertSyllableAfter, neumeOf, noteRefs, parseBody,
  serializeBody, splitFile, splitNote, withoutLineBreaks,
  type GabcBody, type Join, type NoteParts,
} from './Exsurge.Model';

/** How a note was clicked: alone, extending a range (Shift), adding/removing one (Ctrl/Cmd), or twice (its neume). */
export type PickMode = 'single' | 'range' | 'toggle' | 'neume';

interface Box { x: number; y: number; width: number; height: number; staffTop: number; staffBottom: number }
type Visual = HTMLElement & { noteBoxes(): Box[] };

/** The element's interface, for pages written in TypeScript. */
export interface ChantEditorElement extends HTMLElement {
  /** The gabc: a whole file (header and body) or just a body. Setting it starts a new history. */
  value: string;
  /** The header of the file ("" when the value is only a body). */
  readonly header: string;
  /** The parsed body: pass it to the functions of Exsurge.Model. */
  readonly body: GabcBody;
  /** Number of notes (the indices of `selection` go from 0 to noteCount - 1). */
  readonly noteCount: number;
  /** The selected notes, in order. */
  readonly selection: number[];
  /** The note the tools should show (the last one picked), or null. */
  readonly focusNote: number | null;
  /** False when the drawn notes cannot be matched to the gabc (an unusual construct): clicks are off. */
  readonly aligned: boolean;
  /** The <chant-visual> currently shown (for playing and following the notes). */
  readonly chant: HTMLElement | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** Replaces the body (and the header, if given) as one step of the history. */
  apply(body: GabcBody, focus?: number | null, header?: string): void;
  /** Applies `f` to every selected note (once per gabc atom: "gsss" is one atom). */
  editNotes(f: (p: NoteParts) => NoteParts): void;
  select(indices: number[], focus?: number | null, anchor?: number | null): void;
  /** What a click does: `mode` as described in PickMode. */
  pick(index: number, mode?: PickMode): void;
  /** Moves the focus by `delta` notes; `extend` makes a range from the anchor. */
  move(delta: number, extend?: boolean): void;
  selectNeume(): void;
  /** Deletes the selected notes; every syllable keeps at least one. Returns how many were kept. */
  deleteSelected(): number;
  /** Adds a note after the focused one, joined to it or set apart, and selects it. */
  addNote(join?: Join): void;
  /** Adds a syllable after the focused note's syllable, with one note at the same pitch. */
  addSyllable(text: string, newWord: boolean): void;
  undo(): void;
  redo(): void;
  /** Marks notes with a band (e.g. the ones changed from an original). */
  mark(indices: Iterable<number>): void;
  /** Marks the notes whose syllables differ from `original`. */
  markChangesFrom(original: GabcBody): void;
}

const SVG = 'http://www.w3.org/2000/svg';
const PAD = 4;
const HIT = 2.5;

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const STYLE = `
:where(chant-editor) { display: block; position: relative; }
:where(chant-editor:not([readonly])) { user-select: none; -webkit-user-select: none; }
:where(chant-editor > .chant-editor__next) { position: absolute; inset: 0 0 auto 0; visibility: hidden; }
:where(chant-editor svg .chant-editor__hit) { fill: transparent; stroke: none; cursor: pointer; }
:where(chant-editor svg .chant-editor__hit:hover) { fill: none; stroke: var(--chant-select-color, var(--chant-rubric-color, #f00)); stroke-opacity: 0.6; stroke-width: 1; stroke-dasharray: 2 1.5; }
:where(chant-editor svg .chant-editor__sel) { fill: var(--chant-select-color, var(--chant-rubric-color, #f00)); fill-opacity: 0.16; stroke: var(--chant-select-color, var(--chant-rubric-color, #f00)); stroke-opacity: 0.55; stroke-width: 1; }
:where(chant-editor svg .chant-editor__sel--focus) { fill-opacity: 0.24; stroke-opacity: 1; stroke-width: 1.4; }
:where(chant-editor svg .chant-editor__bar) { fill: var(--chant-select-color, var(--chant-rubric-color, #f00)); stroke: none; }
:where(chant-editor svg .chant-editor__mark) { fill: var(--chant-mark-color, #b8902a); fill-opacity: 0.22; stroke: none; }
`;

function rect(cls: string, x: number, y: number, w: number, h: number, rx = 3): SVGRectElement {
  const r = document.createElementNS(SVG, 'rect');
  r.setAttribute('class', cls);
  r.setAttribute('x', String(x));
  r.setAttribute('y', String(y));
  r.setAttribute('width', String(Math.max(w, 1)));
  r.setAttribute('height', String(Math.max(h, 1)));
  r.setAttribute('rx', String(rx));
  return r;
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Registers <chant-editor> (once). Called by exsurge itself in the browser. */
export function defineChantEditor(): void {
  if (customElements.get('chant-editor')) return;

  if (!document.querySelector('style[data-chant-editor]')) {
    const style = document.createElement('style');
    style.setAttribute('data-chant-editor', '');
    style.textContent = STYLE;
    document.head.prepend(style);
  }

  /** The editor the keyboard goes to: the last one clicked (or created). */
  let active: ChantEditor | null = null;

  class ChantEditor extends HTMLElement implements ChantEditorElement {
    static get observedAttributes(): string[] { return ['annotation', 'readonly', 'use-drop-cap', 'line-breaks']; }

    #header = '';
    #body: GabcBody = { syllables: [], tail: '' };
    #history: string[] = [];
    #pos = 0;
    #selected: number[] = [];
    #focus: number | null = null;
    #anchor: number | null = null;
    #marks = new Set<number>();
    #cv: Visual | null = null;
    #expected = 0;
    #observer: MutationObserver | null = null;
    #started = false;

    connectedCallback(): void {
      if (!this.#started) {
        this.#started = true;
        // the text content is the gabc: keep it, never show it as text
        const source = this.textContent ?? '';
        this.textContent = '';
        this.#load(source);
        this.addEventListener('click', this.#onClick);
        this.addEventListener('mousedown', this.#onMouseDown);
      } else if (!this.#cv) {
        this.#draw();
      }
      document.addEventListener('keydown', this.#onKey);
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      if (!this.readOnly) active = this;
    }

    disconnectedCallback(): void {
      document.removeEventListener('keydown', this.#onKey);
      if (active === this) active = null;
    }

    attributeChangedCallback(name: string, old: string | null, value: string | null): void {
      if (!this.#started || old === value) return;
      if (name === 'readonly') { this.#decorate(); return; }
      this.#draw();
    }

    // -- reading

    get readOnly(): boolean { return this.hasAttribute('readonly'); }
    get value(): string {
      // before it is connected the gabc is still its text content
      if (!this.#started) return this.textContent ?? '';
      return this.#header + serializeBody(this.#body);
    }
    set value(v: string) {
      if (!this.#started) { this.textContent = v; return; }
      this.#load(v);
    }
    get header(): string { return this.#header; }
    get body(): GabcBody { return this.#body; }
    get noteCount(): number { return noteRefs(this.#body).length; }
    get selection(): number[] {
      const f = this.#focus;
      if (f === null) return [];
      return this.#selected.includes(f) ? [...this.#selected] : [...this.#selected, f].sort((a, b) => a - b);
    }
    get focusNote(): number | null { return this.#focus; }
    get aligned(): boolean { return !!this.#cv && this.#cv.noteBoxes().length === this.#expected; }
    get chant(): HTMLElement | null { return this.#cv; }
    get canUndo(): boolean { return this.#pos > 0; }
    get canRedo(): boolean { return this.#pos < this.#history.length - 1; }

    // -- history

    #load(text: string): void {
      const f = splitFile(text);
      this.#header = f.header;
      this.#body = parseBody(f.body);
      this.#history = [text];
      this.#pos = 0;
      this.#selected = [];
      this.#focus = null;
      this.#anchor = null;
      this.#draw();
    }

    apply(body: GabcBody, focus: number | null = this.#focus, header: string = this.#header): void {
      // the selection survives edits that keep the notes where they are
      if (focus !== this.#focus || noteRefs(body).length !== noteRefs(this.#body).length)
        this.#setSelection(focus === null ? [] : [focus], focus, focus);
      this.#body = body;
      this.#header = header;
      const text = this.value;
      if (text === this.#history[this.#pos]) { this.#decorate(); this.#emitSelect(); return; }
      this.#history.splice(this.#pos + 1);
      this.#history.push(text);
      this.#pos = this.#history.length - 1;
      this.#draw();
      this.#emitChange();
      this.#emitSelect();
    }

    #goto(p: number): void {
      if (p < 0 || p >= this.#history.length || p === this.#pos) return;
      this.#pos = p;
      const f = splitFile(this.#history[p]);
      this.#header = f.header;
      this.#body = parseBody(f.body);
      const n = this.noteCount;
      if (this.#focus !== null && this.#focus >= n) this.#focus = n ? n - 1 : null;
      this.#selected = this.#selected.filter((i) => i < n);
      this.#draw();
      this.#emitChange();
      this.#emitSelect();
    }

    undo(): void { this.#goto(this.#pos - 1); }
    redo(): void { this.#goto(this.#pos + 1); }

    // -- selection

    #setSelection(list: number[], focus: number | null, anchor: number | null): void {
      this.#selected = [...new Set(list)].sort((a, b) => a - b);
      this.#focus = focus;
      this.#anchor = anchor;
    }

    select(indices: number[], focus: number | null = indices.length ? indices[indices.length - 1] : null, anchor: number | null = focus): void {
      const moved = focus !== this.#focus;
      this.#setSelection(indices, focus, anchor);
      this.#decorate();
      if (focus !== null && moved) this.#reveal();
      this.#emitSelect();
    }

    pick(i: number, mode: PickMode = 'single'): void {
      const focus = this.#focus;
      if (mode === 'single' || focus === null) this.select([i], i);
      else if (mode === 'range') {
        const from = this.#anchor ?? focus;
        const lo = Math.min(from, i), hi = Math.max(from, i);
        this.select(Array.from({ length: hi - lo + 1 }, (_, k) => lo + k), i, from);
      } else if (mode === 'toggle') {
        const cur = this.selection;
        if (cur.includes(i) && cur.length > 1) {
          const rest = cur.filter((x) => x !== i);
          this.select(rest, rest[rest.length - 1]);
        } else this.select([...cur, i], i);
      } else {
        const n = neumeOf(this.#body, i);
        this.select(n, i, n[0]);
      }
    }

    move(delta: number, extend = false): void {
      const n = this.noteCount;
      if (n === 0) return;
      const to = Math.min(Math.max((this.#focus ?? -1) + delta, 0), n - 1);
      if (extend && this.#focus !== null) this.pick(to, 'range');
      else this.select([to], to);
    }

    selectNeume(): void {
      if (this.#focus === null) return;
      const n = neumeOf(this.#body, this.#focus);
      this.select(n, this.#focus, n[0]);
    }

    // -- editing

    editNotes(f: (p: NoteParts) => NoteParts): void {
      const refs = noteRefs(this.#body);
      const seen = new Set<string>();
      let out = this.#body;
      for (const i of this.selection) {
        const r = refs[i];
        const k = `${r.syl}:${r.atom}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out = editNote(out, r, f);
      }
      this.apply(out);
    }

    deleteSelected(): number {
      // from the last selected note back, so the positions of the others do not move
      const targets = this.selection.reverse();
      if (!targets.length) return 0;
      let out = this.#body;
      let kept = 0;
      for (const i of targets) {
        const next = deleteNote(out, noteRefs(out)[i]);
        if (next) out = next; else kept++;
      }
      if (kept) this.dispatchEvent(new CustomEvent('chant-notice', { bubbles: true, detail: { kind: 'last-note', kept, all: kept === targets.length } }));
      if (out !== this.#body) {
        const n = noteRefs(out).length;
        this.apply(out, n ? Math.min(targets[targets.length - 1], n - 1) : null);
      }
      return kept;
    }

    addNote(join: Join = 'joined'): void {
      if (this.#focus === null) return;
      const r = insertNoteAfter(this.#body, noteRefs(this.#body)[this.#focus], join);
      const idx = noteRefs(r.body).findIndex((x) => x.syl === r.ref.syl && x.atom === r.ref.atom);
      this.apply(r.body, idx);
    }

    addSyllable(text: string, newWord: boolean): void {
      if (this.#focus === null) return;
      const ref = noteRefs(this.#body)[this.#focus];
      const pitch = splitNote(this.#body.syllables[ref.syl].notation![ref.atom].s).pitch;
      const out = insertSyllableAfter(this.#body, ref.syl, text.trim(), pitch, newWord);
      const idx = noteRefs(out).findIndex((x) => x.syl === ref.syl + 1);
      this.apply(out, idx >= 0 ? idx : this.#focus);
    }

    mark(indices: Iterable<number>): void {
      this.#marks = new Set(indices);
      this.#decorate();
    }

    markChangesFrom(original: GabcBody): void {
      this.mark(changedNotes(original, this.#body));
    }

    // -- events

    #emitChange(): void {
      this.dispatchEvent(new CustomEvent('chant-change', { bubbles: true, detail: { value: this.value } }));
    }

    #emitSelect(): void {
      this.dispatchEvent(new CustomEvent('chant-select', { bubbles: true, detail: { selected: this.selection, focus: this.#focus } }));
    }

    // -- drawing

    #annotation(): string | null {
      const attr = this.getAttribute('annotation');
      if (attr !== null) return attr || null;
      const mode = headerField(this.#header, 'mode');
      if (!mode) return null;
      const n = Number(mode);
      return Number.isInteger(n) && n >= 1 && n <= 8 ? ROMAN[n] : mode;
    }

    #draw(): void {
      if (!this.isConnected) return;
      this.#expected = this.noteCount;
      let body = serializeBody(this.#body);
      if (this.getAttribute('line-breaks') === 'ignore') body = withoutLineBreaks(body);
      const cv = document.createElement('chant-visual') as Visual;
      cv.setAttribute('use-drop-cap', this.getAttribute('use-drop-cap') ?? 'true');
      const annotation = this.#annotation();
      if (annotation) cv.setAttribute('annotation', annotation);
      cv.textContent = body;
      const old = this.#cv;
      if (old) cv.classList.add('chant-editor__next');
      this.#cv = cv;
      cv.addEventListener('chant-rendered', () => {
        if (this.#cv !== cv) { cv.remove(); return; }
        // the old version goes, unless it is still the one on screen of an older draw
        for (const el of [...this.children]) if (el !== cv && el.localName === 'chant-visual') el.remove();
        cv.classList.remove('chant-editor__next');
        this.#watch(cv);
        this.#decorate();
        this.dispatchEvent(new CustomEvent('chant-drawn', { bubbles: true, detail: { aligned: this.aligned } }));
      }, { once: true });
      this.append(cv);
    }

    /** exsurge redraws the svg when the width changes: draw the selection again. */
    #watch(cv: Visual): void {
      this.#observer?.disconnect();
      this.#observer = new MutationObserver(() => this.#decorate());
      this.#observer.observe(cv, { childList: true });
    }

    #decorate(): void {
      const cv = this.#cv;
      const svg = cv?.querySelector('svg');
      if (!cv || !svg) return;
      svg.querySelectorAll('.chant-editor__layer').forEach((g) => g.remove());
      const main = svg.querySelector(':scope > g') ?? svg;
      const boxes = cv.noteBoxes();
      const aligned = boxes.length === this.#expected;

      const band = (b: Box) => {
        const interval = (b.staffBottom - b.staffTop) / 6;
        const top = Math.min(b.staffTop - interval, b.y - 2);
        const bottom = Math.max(b.staffBottom + interval, b.y + b.height + 2);
        return { x: b.x - PAD, y: top, w: b.width + 2 * PAD, h: bottom - top };
      };

      // behind the notes: marked notes (a band across the staff), then each
      // selected note (a box around that note only, so in a pes you see which one)
      const back = document.createElementNS(SVG, 'g');
      back.setAttribute('class', 'chant-editor__layer');
      back.setAttribute('aria-hidden', 'true');
      if (aligned) {
        for (const i of this.#marks) {
          const b = boxes[i];
          if (!b) continue;
          const r = band(b);
          back.append(rect('chant-editor__mark', r.x, r.y, r.w, r.h));
        }
        if (!this.readOnly) {
          for (const i of this.selection) {
            const b = boxes[i];
            if (!b) continue;
            const cls = i === this.#focus ? 'chant-editor__sel chant-editor__sel--focus' : 'chant-editor__sel';
            back.append(rect(cls, b.x - 2.5, b.y - 2.5, b.width + 5, b.height + 5, 2));
          }
          const f = this.#focus !== null ? boxes[this.#focus] : undefined;
          if (f) {
            const r = band(f);
            back.append(rect('chant-editor__bar', f.x - 2, r.y + r.h - 3, f.width + 4, 3, 1.5));
          }
        }
      }
      main.prepend(back);

      // in front: one transparent target per note, the size of the note
      if (!this.readOnly && aligned) {
        const hits = document.createElementNS(SVG, 'g');
        hits.setAttribute('class', 'chant-editor__layer');
        boxes.forEach((b, i) => {
          const t = rect('chant-editor__hit', b.x - HIT, b.y - HIT, b.width + 2 * HIT, b.height + 2 * HIT, 2);
          t.setAttribute('data-i', String(i));
          hits.append(t);
        });
        main.append(hits);
      }
    }

    #reveal(): void {
      requestAnimationFrame(() => {
        const el = this.querySelector('.chant-editor__sel--focus');
        const r = el?.getBoundingClientRect();
        if (!el || !r) return;
        const margin = 90;
        if (r.top < margin || r.bottom > window.innerHeight - margin)
          el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
      });
    }

    // -- mouse and keyboard

    #onMouseDown = (ev: MouseEvent): void => {
      if (this.readOnly) return;
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      active = this;
      // no text selection while shift-clicking or double clicking
      if (ev.shiftKey || ev.detail >= 2) ev.preventDefault();
    };

    #onClick = (ev: MouseEvent): void => {
      if (this.readOnly) return;
      const i = this.#noteAt(ev);
      if (i === null) return;
      const mode: PickMode = ev.detail >= 2 ? 'neume' : ev.shiftKey ? 'range' : ev.metaKey || ev.ctrlKey ? 'toggle' : 'single';
      if (ev.shiftKey) window.getSelection()?.removeAllRanges();
      this.pick(i, mode);
    };

    /** The note under (or nearest to, on the same staff) a click. */
    #noteAt(ev: MouseEvent): number | null {
      const hit = (ev.target as Element).closest('[data-i]');
      if (hit) return Number(hit.getAttribute('data-i'));
      const cv = this.#cv;
      const main = cv?.querySelector<SVGGraphicsElement>('svg > g');
      if (!cv || !main || !this.aligned) return null;
      const m = main.getScreenCTM();
      if (!m) return null;
      const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
      let best: number | null = null;
      let bestD = Infinity;
      cv.noteBoxes().forEach((b, i) => {
        const space = (b.staffBottom - b.staffTop) / 3;
        if (p.y < b.staffTop - 2 * space || p.y > b.staffBottom + 2 * space) return;
        const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.width));
        const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.height));
        const d = dx * 3 + dy; // horizontal distance counts more: notes above each other are told apart by height
        if (d < bestD) { bestD = d; best = i; }
      });
      return bestD < 40 ? best : null;
    }

    #onKey = (ev: KeyboardEvent): void => {
      if (active !== this || this.readOnly || ev.defaultPrevented || this.getAttribute('keyboard') === 'off') return;
      const t = ev.target as HTMLElement | null;
      if (t?.closest?.('input, textarea, select, [contenteditable]')) return;
      const mod = ev.ctrlKey || ev.metaKey;
      const key = ev.key.toLowerCase();
      if (mod && key === 'z') { ev.preventDefault(); if (ev.shiftKey) this.redo(); else this.undo(); return; }
      if (mod && key === 'y') { ev.preventDefault(); this.redo(); return; }
      if (this.#focus === null || mod || ev.altKey) return;
      switch (ev.key) {
        case 'ArrowLeft': this.move(-1, ev.shiftKey); break;
        case 'ArrowRight': this.move(1, ev.shiftKey); break;
        case 'ArrowUp': this.editNotes((p) => movePitch(p, 1)); break;
        case 'ArrowDown': this.editNotes((p) => movePitch(p, -1)); break;
        case 'Delete': case 'Backspace': this.deleteSelected(); break;
        case 'Escape': this.select([], null); break;
        default: return;
      }
      ev.preventDefault();
    };
  }

  customElements.define('chant-editor', ChantEditor);
}
