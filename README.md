# exsurge

A TypeScript library that renders Gregorian chant in square-note notation, from gabc to SVG, directly in the browser.

This is a fork of [frmatthew/exsurge](https://github.com/frmatthew/exsurge), ported to TypeScript and a modern toolchain, and extended for [Clivis](https://github.com/driacats/mlg-breviary), the Liturgy of the Hours in Gregorian chant for the Movimento Liturgico Giovanile.

## Features

- Parses [gabc](https://gregorio-project.github.io/gabc/) and lays the chant out in lines that fit the available width.
- Outputs SVG (or draws to a canvas), ready to insert in a page.
- `<chant-visual>` custom element: put gabc inside the tag and it renders itself, relaying out when its container is resized.
- Gregorio-style text markup in lyrics (`<i>`, `<b>`, `<sc>`, `<sp>V/</sp>`, `<c>`, `<v>`…), explicit custos, drop caps and annotations.
- Lyric font taken from the CSS variable `--chant-lyric-font`.
- `noteBoxes()` on `<chant-visual>` returns the position of every sung note, so an audio player can highlight the note being played.
- Builds as ESM, CommonJS and a plain `<script>` global, with type declarations.

## Usage

### As a custom element

```html
<script type="module">
  import 'exsurge';
</script>

<chant-visual use-drop-cap="false" annotation="IV">
  (c3) PU(ei)ER(i) *() na(iji)tus(h) est(hhh) no(ih/ji)bis,(i) (;)
</chant-visual>
```

### From code

```javascript
import { ChantContext, Gabc, ChantScore } from 'exsurge';

const ctxt = new ChantContext();
const gabc = '(f3) EC(ce!fg)CE(f) *(,) ad(fe~)vé(f!gwhf)nit(f) (,)';
const mappings = Gabc.createMappingsFromSource(ctxt, gabc);
const score = new ChantScore(ctxt, mappings, true);

score.performLayoutAsync(ctxt, () => {
  score.layoutChantLines(ctxt, 1000, () => {
    const el = document.createElement('div');
    el.innerHTML = score.createSvg(ctxt);
    document.body.appendChild(el);
  });
});
```

`performLayoutAsync` yields to the browser between chunks of work; for short chants or server-side rendering use the synchronous `performLayout`.

### Development

Requires Node.js 18 or later.

```sh
npm install
npm run dev        # demo page with a live gabc editor
npm run build      # dist/exsurge.mjs, .cjs, .iife.js and type declarations
npm test           # test suite (Vitest)
npm run typecheck
npm run lint
```

Known gaps and planned work are listed in [`TODO.md`](TODO.md).

## License

MIT, see [`LICENSE`](LICENSE). Original author: Fr. Matthew Spencer, O.S.J.; see the git history for later contributors.
