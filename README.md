# exsurge
A TypeScript/JavaScript library for rendering Gregorian Chant in square note notation

## Synopsis

exsurge allows developers to create SVG images of square note notation from gabc notation. These SVGs can then be inserted in the DOM or used for presentation purposes.

## Live demo

Run the demo locally to see gabc code rendered to chant on the fly:

```
npm install
npm run dev
```

This opens a page with a live gabc editor and a `<chant-visual>` custom element example.

## Code Example

First, create a `ChantContext` which contains the settings for how the chant will be rendered:

```javascript
import { ChantContext, Gabc, ChantScore } from 'exsurge';

const ctxt = new ChantContext();
```

Then, parse gabc code into mappings and build a `ChantScore`:

```javascript
const gabc = "(f3) EC(ce!fg)CE(f) *(,) ad(fe~)vé(f!gwhf)nit(f) (,)";
const mappings = Gabc.createMappingsFromSource(ctxt, gabc);
const score = new ChantScore(ctxt, mappings, true);
```

Finally, let the `ChantScore` handle the layout process, and use the SVG however you want. `performLayoutAsync` yields to the browser between chunks of work (recommended for web apps); use the synchronous `performLayout` instead for small chants or server-side rendering:

```javascript
score.performLayoutAsync(ctxt, function() {
  score.layoutChantLines(ctxt, 1000, function() {

    // render the score to svg code
    const svgNode = document.createElement('div');
    svgNode.innerHTML = score.createSvg(ctxt);
    document.body.appendChild(svgNode);
  });
});
```

### `<chant-visual>` custom element

For quick embedding, exsurge also registers a `<chant-visual>` custom element that renders its text content as gabc, and relays out automatically when its container is resized:

```html
<chant-visual use-drop-cap="false" annotation="IV">
  (c3) PU(ei)ER(i) *() na(iji)tus(h) est(hhh) no(ih/ji)bis,(i) (;) ...
</chant-visual>
```

## Motivation

Very few good chant layout software exist for developers. exsurge allows web developers to insert beautiful chant into their workflow with the simplicity of a little JavaScript.

## Installation

```
npm install
npm run build
```

This produces `dist/exsurge.mjs` (ESM), `dist/exsurge.cjs` (CommonJS), and `dist/exsurge.iife.js` (a `window.exsurge` global for plain `<script>` tag use), along with type declarations.

Other useful scripts:

- `npm run dev` — starts a dev server for the demo page (`demo/index.html`), served directly from TypeScript source
- `npm test` — runs the test suite (Vitest)
- `npm run typecheck` — runs the TypeScript compiler in check-only mode
- `npm run lint` — runs ESLint

## API Reference

See the source under `src/` — each module is documented with comments. A rolled-up API reference is not yet published; see [`TODO.md`](TODO.md) for known gaps and planned work.

## Tests

`npm test` runs unit tests for the core primitives and Latin syllabifier, plus an end-to-end smoke test that parses a sample gabc chant, lays it out, and renders it to SVG.

## Contributors

- Fr. Matthew Spencer, O.S.J. — original author
- See the git history for the many contributors since

## License

MIT License: http://adampritchard.mit-license.org/ or see [the `LICENSE` file](LICENSE).
