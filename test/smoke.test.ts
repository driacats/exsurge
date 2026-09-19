import { describe, it, expect } from 'vitest';
import { ChantContext } from '../src/Exsurge.Drawing';
import { ChantScore } from '../src/Exsurge.Chant';
import { Gabc } from '../src/Exsurge.Gabc';

// end-to-end smoke test covering the whole gabc -> layout -> SVG pipeline.
// Not a correctness test of the rendering output -- just a regression guard
// against the pipeline throwing or producing nothing, since the parser/layout
// code otherwise has no test coverage at all.
const SAMPLE_GABC =
  "(c4) CHris(ffg)tus(f.) *(,) fac(fg)tus(f) est(f') pro(f) no(ghF'ED.g_e/fg)bis(f.) (;) " +
  "o(f)bé(hf/gh!jj/kjk)di(jij)ens(h_g) (,) us(h!jjh)que(f.) ad(ixfiH'Gh) mor(fgf___)tem,(f.) (:) " +
  "mor(ixf!hhi)tem(g) au(ixgjj//)tem(j.h!iw!jvIG'hw!ivHG) cru(fv.ff)cis.(f_c) (,) " +
  "(fg!hvGF.e!g'h//fhg/hggf.) V/.(z0::c3) Prop(d)ter(d) quod(d) et(fe~) De(eh)us(h.) (,) " +
  "e(h)xal(h)tá(h)vit(h) il(h)lum,(ihhe.//hih___/ihhe.) (,) (hi!kv//lvKI'jvHF.) (,) " +
  "(h_g/ijh'___ jvIH'jvIH'//hvGF.) (:) et(f) de(f!h'i)dit(i) il(i)li(ih/jki/hhf.) (,) " +
  "no(hf/hhh)men,(h.f!gwh!iv.hi/jhh/iih.) (;) quod(d) est(d) su(d)per(d) o(dfE'D)mne(ef) *() " +
  "no(fhG'Fhhh)men.(hhf.) (,) (gxg_fgvED.fgED.fehv.hhhff//dfe/feed.) (::)";

describe('gabc -> SVG end-to-end smoke test', () => {

  it('parses, lays out, and renders a sample chant without throwing', () => {
    const ctxt = new ChantContext();

    expect(() => {
      const mappings = Gabc.createMappingsFromSource(ctxt, SAMPLE_GABC);
      const score = new ChantScore(ctxt, mappings, true);

      score.performLayout(ctxt);
      score.layoutChantLines(ctxt, 1000, () => {});

      expect(score.lines.length).toBeGreaterThan(0);

      const svg = score.createSvg(ctxt);
      expect(svg).toContain('<svg');
      expect(svg.length).toBeGreaterThan(0);
    }).not.toThrow();
  });

  it('renders the README quick-start sample too', () => {
    const ctxt = new ChantContext();
    const gabc = "EC(ce!fg)CE(f) *(,) ad(fe~)vé(f!gwhf)nit(f) (,)";

    const mappings = Gabc.createMappingsFromSource(ctxt, gabc);
    const score = new ChantScore(ctxt, mappings, true);

    score.performLayout(ctxt);
    score.layoutChantLines(ctxt, 1000, () => {});

    const svg = score.createSvg(ctxt);
    expect(svg).toContain('<svg');
  });
});
