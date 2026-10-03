import { describe, it, expect } from 'vitest';
import { ChantContext, parseGabcTextMarkup, hasGabcTextMarkup } from '../src/Exsurge.Drawing';
import { ChantScore } from '../src/Exsurge.Chant';
import { Gabc } from '../src/Exsurge.Gabc';

// gregorio-style <tag> markup in lyric text (as found in every GregoBase file)
// must never show up as literal "<sp>V/</sp>" in the rendered score.

const render = (gabc: string): string => {
  const ctxt = new ChantContext();
  const score = new ChantScore(ctxt, Gabc.createMappingsFromSource(ctxt, gabc), true);
  score.performLayout(ctxt);
  score.layoutChantLines(ctxt, 1000, () => {});
  return score.createSvg(ctxt);
};

const runsText = (text: string) => parseGabcTextMarkup(text).map(r => r.text).join('');

describe('parseGabcTextMarkup', () => {

  it('detects markup only when tags are present', () => {
    expect(hasGabcTextMarkup('<sp>V/</sp>. Mit')).toBe(true);
    expect(hasGabcTextMarkup('Dó')).toBe(false);
    expect(hasGabcTextMarkup('a < b')).toBe(false);
  });

  it('maps versicle, response and antiphon signs to the Exsurge Characters glyphs', () => {
    const runs = parseGabcTextMarkup('<sp>V/</sp>. Mit');
    expect(runs[0]).toEqual({ text: 'V.', properties: "font-family:'Exsurge Characters';fill:#f00;" });
    expect(runs.map(r => r.text).join('')).toBe('V. Mit'); // the period after the tag is part of the glyph
    expect(parseGabcTextMarkup('<sp>R/</sp>')[0].text).toBe('R.');
  });

  it('maps ligature and accented ligature specials', () => {
    expect(runsText("c<sp>'æ</sp>li")).toBe('cǽli');
    expect(runsText("c<sp>'ae</sp>li")).toBe('cǽli');
    expect(runsText('pr<sp>oe</sp>lium')).toBe('prœlium');
  });

  it('turns style tags into span properties', () => {
    const runs = parseGabcTextMarkup('pur<i>a</i>');
    expect(runs).toEqual([
      { text: 'pur', properties: '' },
      { text: 'a', properties: 'font-style:italic;' },
    ]);
    expect(parseGabcTextMarkup('<c><b>T.P.</b></c>')[0].properties).toBe('fill:#f00;font-weight:bold;');
  });

  it('drops verbatim TeX, layout hints and unknown tags', () => {
    expect(runsText('<v>\\greheightstar</v>')).toBe('');
    expect(runsText('<eu>E')).toBe('E');
    expect(runsText('e.</eu>')).toBe('e.');
    expect(runsText('<clear>*')).toBe('*');
    expect(runsText('<foo>ab</foo>')).toBe('ab');
  });
});

describe('rendering gabc with gregorio markup', () => {

  it('never emits literal tags in the SVG', () => {
    const svg = render(
      "(c4) CLa(f)má(f)bo(f) *(;) Qui(g) be(f)ne(gh)fé(g_f)cit(g) mi(g.)hi.(f.) (::) " +
      "<sp>V/</sp>. Mit(ixhi)tet(h) de(g) c<sp>'æ</sp>(gh)lo,(g_') (,) " +
      "<i>T.P.</i>() al(h)le(hi)lú(g.)ia.(g.) (::) <v>\\greheightstar</v>(::) " +
      "<eu>E(j) u(j) o(i) u(j) a(h) e.</eu>(g.) (::)");

    expect(svg).not.toMatch(/&lt;|<\/?(sp|i|v|eu)>/);
    expect(svg).not.toContain('greheightstar');
    expect(svg).toContain('Exsurge Characters');
    expect(svg).toContain('ǽ');
    expect(svg).toContain('font-style:italic;');
  });

  it('builds the drop cap from the plain text when the first syllable has markup', () => {
    const svg = render('(c4) <b>AL</b>(ed~)li(g)gá(hj)vit(j)');
    expect(svg).not.toMatch(/&lt;|<\/?b>/);
  });
});
