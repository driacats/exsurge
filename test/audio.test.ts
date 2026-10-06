import { describe, it, expect } from 'vitest';
import { melodyToMidi, parseGabcMelody, splitEuouae } from '../src/Exsurge.Audio';

const pitches = (gabc: string) => parseGabcMelody(gabc).map((e) => e.pitch);

describe('parseGabcMelody', () => {
  it('reads pitches relative to a C clef (do = C4)', () => {
    // c4: j = do, h = la, g = sol, f = fa
    expect(pitches('(c4) A(j)b(h)c(g)d(f)')).toEqual([60, 57, 55, 53]);
    // c3: h = do
    expect(pitches('(c3) A(h)b(i)c(g)')).toEqual([60, 62, 59]);
  });

  it('reads an F clef', () => {
    // f3: h = fa
    expect(pitches('(f3) A(h)b(i)c(f)')).toEqual([65, 67, 62]);
  });

  it('applies a flat until the next bar', () => {
    // c4: i = si, "ix" makes it si bemolle
    expect(pitches('(c4) A(ixi)b(i) (,) c(i)')).toEqual([58, 58, null, 59]);
  });

  it('lengthens dotted notes and episemata, rests at bars', () => {
    const ev = parseGabcMelody('(c4) A(g.)b(h_)c(j) (::)');
    expect(ev.map((e) => e.beats)).toEqual([2, 1.5, 1]);
  });

  it('ignores lyrics, custodes, rhombi shapes and verbatim parts', () => {
    expect(pitches('(c4) <sp>V/</sp>. Mit(ixhi)tet(h) Dó(jIG) (::h+Z) x(h[ob:1;6mm])')).toEqual([57, 58, 57, 60, 58, 55, null, 57]);
  });

  it('writes a valid MIDI header', () => {
    const midi = melodyToMidi(parseGabcMelody('(c4) A(j)'));
    expect(String.fromCharCode(...midi.slice(0, 4))).toBe('MThd');
    expect(String.fromCharCode(...midi.slice(14, 18))).toBe('MTrk');
  });
});

describe('splitEuouae', () => {
  it('separates the EUOUAE written as syllables, keeping the clef', () => {
    const s = splitEuouae('(c3) Ve(f)ní(d_0e)te.(e.) (::) E(h)u(h)o(g)u(h)a(f)e.(e.) (::)');
    expect(s.main).toBe('(c3) Ve(f)ní(d_0e)te.(e.) (::) ');
    expect(s.euouae).toBe('(c3) E(h)u(h)o(g)u(h)a(f)e.(e.) (::)');
    expect(parseGabcMelody(s.euouae!).map((e) => e.pitch)).toEqual([60, 60, 59, 60, 57, 55]);
  });
  it('separates the EUOUAE in <eu> tags', () => {
    expect(splitEuouae('(f3) CAn(f)to(h) (::) <eu>E(h) u(h) o(h) u(g) a(ef) e.</eu>(f.) (::)').euouae)
      .toBe('(f3) <eu>E(h) u(h) o(h) u(g) a(ef) e.</eu>(f.) (::)');
  });
  it('leaves chants without EUOUAE alone', () => {
    expect(splitEuouae('(c4) TE(g) lu(i)cis(h)').euouae).toBeNull();
  });
});

describe('playMelody', () => {
  it('ends at once where there is no Web Audio', async () => {
    const { playMelody } = await import('../src/Exsurge.Audio');
    let ended = false;
    playMelody(parseGabcMelody('(c4) A(j)'), { onEnd: () => { ended = true; } });
    expect(ended).toBe(true);
  });
});

describe('followScore', () => {
  const box = (x: number, line: number) => ({ x, y: line + 5, width: 6, height: 6, staffTop: line, staffBottom: line + 24 });
  const fakeScore = (boxes: ReturnType<typeof box>[]) => {
    const el = document.createElement('div') as HTMLDivElement & { noteBoxes: () => typeof boxes };
    el.innerHTML = '<svg><g></g></svg>';
    el.noteBoxes = () => boxes;
    return el;
  };

  it('moves a band to the sounding note, behind the notes', async () => {
    const { followScore } = await import('../src/Exsurge.Follow');
    const score = fakeScore([box(10, 0), box(30, 0), box(10, 50)]);
    const f = followScore(score);
    f.show(1);
    const g = score.querySelector('svg > g > g.playhead') as SVGGElement;
    expect(g).not.toBeNull();
    expect(g.style.transform).toBe('translate(26px, -4px)');
    f.show(2);
    expect(g.style.transform).toBe('translate(6px, 46px)');
    f.show(null);
    expect(g.classList.contains('playhead--rest')).toBe(true);
    f.clear();
    expect(score.querySelector('.playhead')).toBeNull();
  });

  it('matches positions proportionally when the counts differ', async () => {
    const { followScore } = await import('../src/Exsurge.Follow');
    const score = fakeScore([box(0, 0), box(100, 0)]);
    const f = followScore(score, 0, 3);
    f.show(2);
    expect((score.querySelector('g.playhead') as SVGGElement).style.transform).toBe('translate(96px, -4px)');
  });
});
