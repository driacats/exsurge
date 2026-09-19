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

// client side support: a <chant-visual> custom element (Custom Elements v1) that
// renders its text content as gabc notation, laid out as SVG, and relayouts
// whenever its containing element is resized.
//
//   <chant-visual use-drop-cap="false" annotation="IV">
//     (c3) PU(ei)ER(i) *() na(iji)tus(h) est(hhh) ...
//   </chant-visual>
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {

  class ChantVisualElement extends HTMLElement {
    #ctxt: ChantContext | null = null;
    #score: ChantScore | null = null;
    #resizeObserver: ResizeObserver | null = null;
    #lastWidth = 0;

    connectedCallback(): void {
      const ctxt = new ChantContext();
      this.#ctxt = ctxt;

      ctxt.lyricTextFont = "'Crimson Text', serif";
      ctxt.lyricTextSize *= 1.2;
      ctxt.dropCapTextFont = ctxt.lyricTextFont;
      ctxt.annotationTextFont = ctxt.lyricTextFont;

      // capture the gabc source from the element's original text content
      // before we start overwriting innerHTML with the rendered SVG
      const gabcSource = this.textContent ?? '';

      const useDropCap = this.getAttribute('use-drop-cap') !== 'false';
      const mappings = Gabc.createMappingsFromSource(ctxt, gabcSource);
      const score = new ChantScore(ctxt, mappings, useDropCap);
      this.#score = score;

      const annotationAttr = this.getAttribute('annotation');
      if (annotationAttr)
        score.annotation = new Annotation(ctxt, annotationAttr);

      this.#layout();

      this.#resizeObserver = new ResizeObserver(() => this.#layout());
      if (this.parentElement)
        this.#resizeObserver.observe(this.parentElement);
    }

    disconnectedCallback(): void {
      this.#resizeObserver?.disconnect();
      this.#resizeObserver = null;
    }

    #layout(): void {
      const ctxt = this.#ctxt;
      const score = this.#score;
      if (!ctxt || !score || !this.parentElement)
        return;

      const newWidth = this.parentElement.clientWidth;
      if (newWidth === this.#lastWidth)
        return;
      this.#lastWidth = newWidth;

      score.performLayoutAsync(ctxt, () => {
        score.layoutChantLines(ctxt, newWidth, () => {
          this.innerHTML = score.createSvg(ctxt);
        });
      });
    }
  }

  if (!customElements.get('chant-visual'))
    customElements.define('chant-visual', ChantVisualElement);
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
