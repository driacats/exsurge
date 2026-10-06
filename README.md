<p align="center">
  <img src="assets/logo-exsurge.svg" alt="exsurge logo" width="96">
</p>

<h1 align="center">exsurge</h1>

<p align="center">A TypeScript library that renders Gregorian chant in square-note notation, from gabc to SVG, directly in the browser.</p>

The logo is a pes, the neume of two rising notes: <em>exsurge</em> means "arise".

This is a fork of [frmatthew/exsurge](https://github.com/frmatthew/exsurge), ported to TypeScript and a modern toolchain, and extended for [Clivis](https://github.com/driacats/mlg-breviary), the Liturgy of the Hours in Gregorian chant for the Movimento Liturgico Giovanile.

## Features

- Parses [gabc](https://gregorio-project.github.io/gabc/) and lays the chant out in lines that fit the available width.
- Outputs SVG (or draws to a canvas), ready to insert in a page.
- `<chant-visual>` custom element: put gabc inside the tag and it renders itself, relaying out when its container is resized.
- Gregorio-style text markup in lyrics (`<i>`, `<b>`, `<sc>`, `<sp>V/</sp>`, `<c>`, `<v>`…), explicit custos, drop caps and annotations.
- Lyric font and rubric colour taken from the CSS variables `--chant-lyric-font` and `--chant-rubric-color`.
- The gabc inside `<chant-visual>` is never shown as text: the element stays empty until the score is drawn, then gets the `rendered` attribute and fires `chant-rendered`, so a page can style a placeholder with `chant-visual:not([rendered])`.
- Listening: `play()` on `<chant-visual>` sings the score with a soft organ-like tone and highlights each note while it sounds; the melody can also be saved as a MIDI file.
- `noteBoxes()` on `<chant-visual>` returns the position of every sung note.
- `<chant-editor>` custom element: a score edited note by note with the mouse and the keyboard, with undo, built on a lossless gabc model (`parseBody` / `serializeBody` give back exactly the text they read).
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

### Listening

```javascript
const chant = document.querySelector('chant-visual');
button.addEventListener('click', () => {
  const stop = chant.play({ secondsPerBeat: 0.45, onEnd: () => console.log('done') });
});
```

Browsers only allow sound after the user interacts, so call `play()` from a click or a tap. The same pieces are available on their own:

- `parseGabcMelody(gabc)`: the notes of a gabc body, with MIDI pitches (do = C4) and durations in beats (a dotted note lasts 2, a note with an episema 1.5, bars become rests).
- `playMelody(events, { secondsPerBeat, onNote, onEnd, volume })`: plays them with the Web Audio API and returns a function that stops them. Only one melody plays at a time.
- `followScore(chantVisual, offset, total)`: highlights the note reported by `onNote` on a rendered score, for when only part of it is played.
- `melodyToMidi(events, secondsPerBeat)`: a standard MIDI file, as bytes.
- `splitEuouae(gabc)`: separates an antiphon from its EUOUAE, so the two can be played on their own.

The highlight takes its colour from `--chant-playhead-color` (default: the rubric colour) and its opacity from `--chant-playhead-opacity` (default 0.15).

### Editing

```html
<chant-editor line-breaks="ignore">name:Ecce;
mode:2;
%%
(f3) EC(e)ce(f) Dó(fh)mi(h)nus(hiH'Gh) (,) vé(h)ni(hih)et,(e.) (::)</chant-editor>
```

A click selects a note, Shift+click a range, Ctrl/Cmd+click adds or removes one, a double click selects the neume. ← → move the selection (with Shift they extend it), ↑ ↓ raise and lower the selected notes, Delete removes them, Esc clears the selection, Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z undo and redo.

The page adds its own tools with the functions of the model, which take a parsed body and return a new one:

```javascript
import { setShape, toggleSign, setBarAfter, noteRefs } from 'exsurge';

const editor = document.querySelector('chant-editor');
editor.editNotes((note) => setShape(note, 'virga'));      // every selected note
editor.editNotes((note) => toggleSign(note, 'episema'));
const ref = noteRefs(editor.body)[editor.focusNote];
editor.apply(setBarAfter(editor.body, ref.syl, ';'));      // one step of the history
editor.addEventListener('chant-change', () => save(editor.value));
```

- Properties: `value` (the whole gabc, header included; setting it starts a new history), `header`, `body`, `noteCount`, `selection`, `focusNote`, `aligned`, `chant` (the `<chant-visual>` shown, e.g. for `followScore`), `canUndo`, `canRedo`.
- Methods: `apply(body, focus?, header?)`, `editNotes(f)`, `select(indices, focus?)`, `pick(i, mode)`, `move(delta, extend?)`, `selectNeume()`, `deleteSelected()`, `addNote(join?)`, `addSyllable(text, newWord)`, `undo()`, `redo()`, `mark(indices)`, `markChangesFrom(body)`.
- Attributes: `readonly`, `annotation` (default: the mode from the header in Roman numerals), `use-drop-cap`, `line-breaks="ignore"`, `keyboard="off"`.
- Events: `chant-change`, `chant-select`, `chant-drawn` (with `aligned`), `chant-notice` (some notes were not deleted: every syllable keeps one).
- Colours: `--chant-select-color` for the selection, `--chant-mark-color` for `mark()`.
- `notationIcon(key)` draws small icons of the signs (shapes, liquescences, accidentals, signs, joins, bars) for the buttons of a toolbar.

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
