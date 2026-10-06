// Shows, on a <chant-visual>, which note is sounding while a melody plays: a
// soft band across the staff behind the note, with a bar under it.
//
// The note positions come from noteBoxes(), in sung order; the player counts
// pitched notes in the same order. If the two counts ever differ (an unusual
// gabc construct), positions are matched proportionally so the band still
// moves along the right part of the line.
//
// Colours come from CSS: --chant-playhead-color (default: the rubric colour)
// and --chant-playhead-opacity for the band (default 0.15). The elements have
// the classes playhead, playhead__band, playhead__bar and playhead--rest, so a
// page can restyle them.

/** The position of a drawn note (see <chant-visual>.noteBoxes()). */
interface NoteBox { x: number; y: number; width: number; height: number; staffTop: number; staffBottom: number }

type ChantVisual = Element & { noteBoxes?: () => NoteBox[] };

const COLOR = 'var(--chant-playhead-color, var(--chant-rubric-color, #f00))';

const SVG = 'http://www.w3.org/2000/svg';
const PAD_X = 4;

export interface Follower {
  show(index: number | null): void;
  clear(): void;
}

/**
 * Follows the notes of `score` (a rendered <chant-visual>): pass `show` as the
 * `onNote` of playMelody, and call `clear` when it ends.
 *
 * `offset`: index of the first played note within the score, when only a part
 * is played (e.g. the EUOUAE after an antiphon). `total`: pitched notes in the
 * whole score according to parseGabcMelody; when given and different from the
 * drawn notes, positions are matched proportionally.
 */
export function followScore(score: ChantVisual, offset = 0, total?: number): Follower {
  let lastLine: number | null = null;

  const head = (svg: SVGSVGElement): SVGGElement => {
    let g = svg.querySelector<SVGGElement>('g.playhead');
    if (!g) {
      g = document.createElementNS(SVG, 'g');
      g.setAttribute('class', 'playhead');
      g.setAttribute('aria-hidden', 'true');
      const band = document.createElementNS(SVG, 'rect');
      band.setAttribute('class', 'playhead__band');
      band.setAttribute('rx', '3');
      band.setAttribute('style', `fill:${COLOR};fill-opacity:var(--chant-playhead-opacity, 0.15);stroke:none`);
      const bar = document.createElementNS(SVG, 'rect');
      bar.setAttribute('class', 'playhead__bar');
      bar.setAttribute('rx', '1.5');
      bar.setAttribute('style', `fill:${COLOR};stroke:none`);
      g.append(band, bar);
      g.style.pointerEvents = 'none';
      // behind the notes: first thing inside the score's main group
      const main = svg.querySelector(':scope > g');
      (main ?? svg).prepend(g);
      lastLine = null;
    }
    return g;
  };

  const clear = () => {
    score.querySelector('g.playhead')?.remove();
    lastLine = null;
  };

  const show = (index: number | null) => {
    const svg = score.querySelector('svg');
    const boxes = score.noteBoxes?.() ?? [];
    if (!svg || boxes.length === 0) return;
    const g = head(svg);
    if (index === null) { g.classList.add('playhead--rest'); g.style.opacity = '0.45'; return; }
    g.classList.remove('playhead--rest');
    g.style.opacity = '';

    let k = offset + index;
    if (total !== undefined && boxes.length !== total && total > 1) k = Math.round(k * (boxes.length - 1) / (total - 1));
    const b = boxes[Math.min(Math.max(k, 0), boxes.length - 1)];

    const interval = (b.staffBottom - b.staffTop) / 6;
    const top = Math.min(b.staffTop - interval, b.y - 2);
    const bottom = Math.max(b.staffBottom + interval, b.y + b.height + 2);
    const width = b.width + 2 * PAD_X;
    const band = g.querySelector('.playhead__band')!;
    const bar = g.querySelector('.playhead__bar')!;
    band.setAttribute('width', String(width));
    band.setAttribute('height', String(bottom - top));
    bar.setAttribute('width', String(width));
    bar.setAttribute('height', '3');
    bar.setAttribute('y', String(bottom - top - 3));

    // glide along a line, jump (no animation) to a new one
    const newLine = lastLine !== b.staffTop;
    g.classList.toggle('playhead--jump', newLine);
    g.style.transition = newLine || reducedMotion() ? 'opacity 0.2s' : 'transform 0.12s ease-out, opacity 0.2s';
    g.style.transform = `translate(${b.x - PAD_X}px, ${top}px)`;

    if (newLine) {
      lastLine = b.staffTop;
      keepInView(band);
    }
  };

  return { show, clear };
}

/** Scrolls gently when the playing line leaves the screen. */
function keepInView(el: Element): void {
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    const margin = 80;
    if (r.top < margin || r.bottom > window.innerHeight - margin) {
      el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  });
}

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
