//
// Author(s):
// Fr. Matthew Spencer, OSJ <mspencer@osjusa.org>
//
// Copyright (c) 2008-2016 Fr. Matthew Spencer, OSJ
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

'use strict';

import { Annotation, ChantContext } from './Exsurge.Drawing';
import { ChantScore } from './Exsurge.Chant';
import { Gabc } from './Exsurge.Gabc';
import { parseGabcMelody, playMelody, type MelodyEvent, type PlayOptions } from './Exsurge.Audio';
import { followScore } from './Exsurge.Follow';
import { defineChantEditor } from './Exsurge.Editor';

// client side support: a <chant-visual> custom element (Custom Elements v1) that
// renders its text content as gabc notation, laid out as SVG, and relayouts
// whenever its containing element is resized. The gabc is never shown as text:
// until the score is drawn the element is empty and has no `rendered`
// attribute, so a page can show a placeholder with chant-visual:not([rendered]).
//
//   <chant-visual use-drop-cap="false" annotation="IV">
//     (c3) PU(ei)ER(i) *() na(iji)tus(h) est(hhh) ...
//   </chant-visual>
/** Position of one drawn note (see ChantVisualElement.noteBoxes). */
export interface NoteBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** top and bottom staff lines of the line the note is on */
  staffTop: number;
  staffBottom: number;
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {

  class ChantVisualElement extends HTMLElement {
    #ctxt: ChantContext | null = null;
    #score: ChantScore | null = null;
    #resizeObserver: ResizeObserver | null = null;
    #lastWidth = 0;
    #source = '';
    /** false until the lyric font has loaded (or we gave up waiting for it) */
    #fontReady = false;
    #busy = false;
    #again = false;

    /** The gabc the element was created with (its text content before rendering). */
    get source(): string { return this.#source; }

    connectedCallback(): void {
      // moved to another place in the page: keep the score, lay it out again
      if (this.#score) {
        this.#observe();
        this.#lastWidth = 0;
        this.#layout();
        return;
      }

      const ctxt = new ChantContext();
      this.#ctxt = ctxt;

      // the lyric font can be set from CSS with --chant-lyric-font
      const cssFont = getComputedStyle(this).getPropertyValue('--chant-lyric-font').trim();
      // (double quotes would break the SVG style attributes exsurge writes)
      ctxt.lyricTextFont = cssFont.replace(/"/g, "'") || "'Crimson Text', serif";
      ctxt.lyricTextSize *= 1.2;
      ctxt.dropCapTextFont = ctxt.lyricTextFont;
      ctxt.annotationTextFont = ctxt.lyricTextFont;

      // the text content is the gabc source: keep it, but never show it as text
      // while the score is being laid out
      this.#source = this.textContent ?? '';
      this.textContent = '';
      this.setAttribute('aria-busy', 'true');

      const useDropCap = this.getAttribute('use-drop-cap') !== 'false';
      const mappings = Gabc.createMappingsFromSource(ctxt, this.#source);
      const score = new ChantScore(ctxt, mappings, useDropCap);
      this.#score = score;

      const annotationAttr = this.getAttribute('annotation');
      if (annotationAttr)
        score.annotation = new Annotation(ctxt, annotationAttr);

      // the lyrics are measured with the lyric font: wait for it before the
      // first layout (a moment at most), so the score is drawn once and right
      const fontLoaded = document.fonts?.load(`${ctxt.lyricTextSize}px ${ctxt.lyricTextFont}`) ?? Promise.resolve();
      const giveUp = new Promise((resolve) => setTimeout(resolve, 1500));
      Promise.race([fontLoaded, giveUp]).catch(() => { /* lay out with the fallback font */ }).then(() => {
        this.#fontReady = true;
        this.#layout();
      });
      // the font arrived after we gave up: lay out again with it
      fontLoaded.then(() => {
        if (!this.hasAttribute('rendered')) return;
        this.#lastWidth = 0;
        this.#layout();
      }, () => { /* keep the fallback layout */ });

      this.#observe();
    }

    /**
     * Where every sung note is drawn, in the SVG's own coordinates, in the order
     * the notes are sung (custodes, clefs and bars excluded). Used to follow the
     * melody while it plays. Empty until the score has been laid out.
     */
    noteBoxes(): NoteBox[] {
      const score = this.#score;
      const ctxt = this.#ctxt;
      if (!score || !ctxt) return [];
      const boxes: NoteBox[] = [];
      const half = 3 * ctxt.staffInterval;
      for (const line of score.lines ?? []) {
        const end = line.notationsStartIndex + line.numNotationsOnLine;
        for (let i = line.notationsStartIndex; i < end; i++) {
          const notation = score.notations[i];
          if (!notation?.isNeume) continue;
          for (const note of notation.notes ?? []) {
            const b = note.bounds;
            boxes.push({
              x: line.bounds.x + notation.bounds.x + b.x,
              y: line.bounds.y + b.y,
              width: b.width,
              height: b.height,
              staffTop: line.bounds.y - half,
              staffBottom: line.bounds.y + half,
            });
          }
        }
      }
      return boxes;
    }

    /** The melody of the score, for playback or MIDI (see Exsurge.Audio). */
    melody(): MelodyEvent[] {
      return parseGabcMelody(this.#source);
    }

    /**
     * Plays the whole score, highlighting each note on the staff while it
     * sounds. Call it from a click or a tap. Returns a function that stops it.
     */
    play(options: PlayOptions = {}): () => void {
      const events = this.melody();
      const follower = followScore(this, 0, events.filter((e) => e.pitch !== null).length);
      return playMelody(events, {
        ...options,
        onNote: (i) => { follower.show(i); options.onNote?.(i); },
        onEnd: () => { follower.clear(); options.onEnd?.(); },
      });
    }

    disconnectedCallback(): void {
      this.#resizeObserver?.disconnect();
      this.#resizeObserver = null;
    }

    #observe(): void {
      this.#resizeObserver?.disconnect();
      this.#resizeObserver = new ResizeObserver(() => this.#layout());
      if (this.parentElement)
        this.#resizeObserver.observe(this.parentElement);
    }

    /**
     * Lays the score out for the width of the parent (nothing while it is hidden
     * and has no width). One layout at a time: a resize during a layout is
     * handled when it finishes. The first one sets the `rendered` attribute and
     * fires a `chant-rendered` event.
     */
    #layout(): void {
      const ctxt = this.#ctxt;
      const score = this.#score;
      if (!ctxt || !score || !this.parentElement || !this.#fontReady)
        return;
      if (this.#busy) {
        this.#again = true;
        return;
      }

      const newWidth = this.parentElement.clientWidth;
      if (newWidth === 0 || newWidth === this.#lastWidth)
        return;
      this.#lastWidth = newWidth;
      this.#busy = true;

      score.performLayoutAsync(ctxt, () => {
        score.layoutChantLines(ctxt, newWidth, () => {
          this.innerHTML = score.createSvg(ctxt);
          this.#busy = false;
          if (!this.hasAttribute('rendered')) {
            this.setAttribute('rendered', '');
            this.removeAttribute('aria-busy');
            this.dispatchEvent(new Event('chant-rendered', { bubbles: true }));
          }
          if (this.#again) {
            this.#again = false;
            this.#layout();
          }
        });
      });
    }
  }

  if (!customElements.get('chant-visual'))
    customElements.define('chant-visual', ChantVisualElement);

  // <chant-editor>: a <chant-visual> that can be edited note by note
  defineChantEditor();
}

export * from './Exsurge.Core';
export * from './Exsurge.Text';
export * from './Exsurge.Glyphs';
export * from './Exsurge.Drawing';
export * from './Exsurge.Chant';
export * from './Exsurge.Chant.Markings';
export * from './Exsurge.Chant.Signs';
export * from './Exsurge.Chant.Neumes';
export * from './Exsurge.Gabc';
export * from './Exsurge.Audio';
export * from './Exsurge.Follow';
export * from './Exsurge.Model';
export * from './Exsurge.Editor';
export * from './Exsurge.Icons';
