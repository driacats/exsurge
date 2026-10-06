import { ChantContext, Annotation, ChantScore, Gabc } from '../src/index';
// registers the <chant-visual> custom element as a side effect:
import '../src/index';

const ctxt = new ChantContext();

ctxt.lyricTextFont = "'Crimson Text', serif";
ctxt.lyricTextSize *= 1.2;
ctxt.dropCapTextFont = ctxt.lyricTextFont;
ctxt.annotationTextFont = ctxt.lyricTextFont;

let mappings: any[] | null = null;
let score: ChantScore | null = null;

const gabcSource = document.getElementById('gabcSource') as HTMLTextAreaElement;
const chantContainer = document.getElementById('chant-container') as HTMLDivElement;

function layoutChant() {
  if (!score) return;
  score.performLayoutAsync(ctxt, () => {
    score!.layoutChantLines(ctxt, chantContainer.clientWidth, () => {
      chantContainer.innerHTML = score!.createSvg(ctxt);
    });
  });
}

function updateChant() {
  if (score) {
    Gabc.updateMappingsFromSource(ctxt, (score as any).mappings, gabcSource.value);
    (score as any).updateNotations(ctxt);
  } else {
    mappings = Gabc.createMappingsFromSource(ctxt, gabcSource.value);
    score = new ChantScore(ctxt, mappings, true);
    score.annotation = new Annotation(ctxt, "%V%");
  }

  layoutChant();
}

gabcSource.addEventListener('input', updateChant);
gabcSource.addEventListener('change', updateChant);
window.addEventListener('resize', layoutChant);

updateChant();

// listening: <chant-visual>.play() highlights each note while it sounds
const playButton = document.getElementById('play') as HTMLButtonElement;
const chantVisual = document.querySelector('chant-visual') as HTMLElement & { play: (o?: object) => () => void };
let stop: (() => void) | null = null;
playButton.addEventListener('click', () => {
  if (stop) { stop(); return; }
  playButton.textContent = 'Stop';
  stop = chantVisual.play({ onEnd: () => { stop = null; playButton.textContent = 'Listen'; } });
});

// <chant-editor>: show the selection and the gabc as they change
const editor = document.getElementById('editor') as HTMLElement & { value: string; selection: number[]; focusNote: number | null };
const editorStatus = document.getElementById('editor-status') as HTMLParagraphElement;
const editorGabc = document.getElementById('editor-gabc') as HTMLPreElement;
const showEditor = () => {
  editorStatus.textContent = editor.selection.length ? `Selected notes: ${editor.selection.map((i) => i + 1).join(', ')}` : 'No note selected.';
  editorGabc.textContent = editor.value;
};
editor.addEventListener('chant-select', showEditor);
editor.addEventListener('chant-change', showEditor);
customElements.whenDefined('chant-editor').then(showEditor);
