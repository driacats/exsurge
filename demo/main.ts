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
