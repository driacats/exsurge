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

import { Units, Pitch, Point, Rect, Margins, Size, Step } from './Exsurge.Core'
import { Glyphs } from './Exsurge.Glyphs'
import { Latin } from './Exsurge.Text'


// load in the web font for special chant characters here (published as a separate
// file in dist/ so it is cacheable across pages using the library):
// Note: Vite's library mode always inlines non-CSS assets as base64 -- true
// separate-file serving isn't practical here since this build targets three
// output formats (ESM/CJS/IIFE) and only ESM/CJS can reliably resolve a
// relative runtime URL via import.meta.url; IIFE (the <script>-tag consumer)
// cannot. This matches the original library's behavior anyway, which already
// inlined this font as base64 via webpack's url-loader. See TODO.md.
import __exsurgeCharactersFont from '../assets/fonts/ExsurgeChar.otf?inline';


/**
 * Fill of rubric text (directives, ℣ ℟ * †, <c>…</c>): red unless the page sets
 * --chant-rubric-color (e.g. a softer red for a dark theme).
 */
export const RUBRIC_FILL = 'fill:var(--chant-rubric-color, #f00);';

export const GlyphCode = {

  None: "None",

  AcuteAccent: "AcuteAccent",
  Stropha: "Stropha",
  StrophaLiquescent: "StrophaLiquescent",

  BeginningAscLiquescent: "BeginningAscLiquescent",
  BeginningDesLiquescent: "BeginningDesLiquescent",

  CustosDescLong: "CustosDescLong",
  CustosDescShort: "CustosDescShort",
  CustosLong: "CustosLong",
  CustosShort: "CustosShort",

  // clefs and other markings
  DoClef: "DoClef",
  FaClef: "FaClef",
  Flat: "Flat",
  Mora: "Mora",
  Natural: "Natural",
  OriscusAsc: "OriscusAsc",
  OriscusDes: "OriscusDes",
  OriscusLiquescent: "OriscusLiquescent",

  PodatusLower: "PodatusLower",
  PodatusUpper: "PodatusUpper",

  Porrectus1: "Porrectus1", // 1 staff line difference,
  Porrectus2: "Porrectus2", // 2 lines difference, etc...
  Porrectus3: "Porrectus3",
  Porrectus4: "Porrectus4",

  PunctumCavum: "PunctumCavum",
  PunctumQuadratum: "PunctumQuadratum",
  PunctumQuadratumAscLiquescent: "PunctumQuadratumAscLiquescent",
  PunctumQuadratumDesLiquescent: "PunctumQuadratumDesLiquescent",
  PunctumInclinatum: "PunctumInclinatum",
  PunctumInclinatumLiquescent: "PunctumInclinatumLiquescent",
  Quilisma: "Quilisma",

  TerminatingAscLiquescent: "TerminatingAscLiquescent",
  TerminatingDesLiquescent: "TerminatingDesLiquescent",
  VerticalEpisemaAbove: "VerticalEpisemaAbove",
  VerticalEpisemaBelow: "VerticalEpisemaBelow",
  VirgaLong: "VirgaLong",
  VirgaShort: "VirgaShort",
  Virgula: "Virgula",

  UpperBrace: "UpperBrace"
}; // GlyphCode

// the root <svg> node also carries a couple of ad-hoc properties bolted on
// by QuickSvg.svg() below (a direct reference to its <defs> child, and a
// helper to clear out all notation content while keeping defs intact)
export interface ExsurgeSvgRoot extends SVGSVGElement {
  defs: SVGDefsElement;
  clearNotations(): void;
}

export var QuickSvg = {

  // namespaces
  ns: 'http://www.w3.org/2000/svg',
  xmlns: 'http://www.w3.org/2000/xmlns/',
  xlink: 'http://www.w3.org/1999/xlink',

  // create the root level svg object
  svg: function(width: number, height: number): ExsurgeSvgRoot {
    var node = document.createElementNS(this.ns, 'svg') as unknown as ExsurgeSvgRoot;

    node.setAttribute('xmlns', this.ns);
    node.setAttribute('version', '1.1');
    node.setAttributeNS(this.xmlns, 'xmlns:xlink', this.xlink);

    node.setAttribute('width', String(width));
    node.setAttribute('height', String(height));

    // create the defs element
    var defs = document.createElementNS(this.ns, 'defs') as unknown as SVGDefsElement;
    node.appendChild(defs);

    node.defs = defs;

    node.clearNotations = function() {
      // clear out all children except defs
      node.removeChild(defs);

      while (node.hasChildNodes())
        node.removeChild(node.lastChild as ChildNode);

      node.appendChild(defs);
    }

    return node;
  },

  rect: function(width: number, height: number): SVGRectElement {
    var node = document.createElementNS(this.ns, 'rect') as unknown as SVGRectElement;

    node.setAttribute('width', String(width));
    node.setAttribute('height', String(height));

    return node;
  },

  line: function(x1: number, y1: number, x2: number, y2: number): SVGLineElement {
    var node = document.createElementNS(this.ns, 'line') as unknown as SVGLineElement;

    node.setAttribute('x1', String(x1));
    node.setAttribute('y1', String(y1));
    node.setAttribute('x2', String(x2));
    node.setAttribute('y2', String(y2));

    return node;
  },

  g: function(): SVGGElement {
    var node = document.createElementNS(this.ns, 'g') as unknown as SVGGElement;

    return node;
  },

  text: function(): SVGTextElement {
    var node = document.createElementNS(this.ns, 'text') as unknown as SVGTextElement;

    return node;
  },

  tspan: function(str: string): SVGTSpanElement {
    var node = document.createElementNS(this.ns, 'tspan') as unknown as SVGTSpanElement;
    node.textContent = str;

    return node;
  },

  // nodeRef should be the id of the object in defs (without the #)
  use: function(nodeRef: string): SVGUseElement {
    var node = document.createElementNS(this.ns, 'use') as unknown as SVGUseElement;
    node.setAttributeNS(this.xlink, "xlink:href", '#' + nodeRef);

    return node;
  },

  createFragment: function(name: string, attributes: Record<string, string | number>, child: string | null = ''): string {
    if (child === undefined || child === null)
      child = '';

    var fragment = '<' + name + ' ';

    for (var attr in attributes) {
      if (Object.prototype.hasOwnProperty.call(attributes, attr))
        fragment += attr + '="' + attributes[attr] + '" ';
    }

    fragment += '>' + child + '</' + name + '>';

    return fragment;
  },

  parseFragment: function(fragment: string): SVGGElement | undefined {

    // create temporary holder
    var well = document.createElement('svg');

    // act as a setter if svg is given
    if (fragment) {

      var container = this.g();

      // dump raw svg
      // do this to allow the browser to automatically create svg nodes?
      well.innerHTML = '<svg>' + fragment.replace(/\n/, '').replace(/<(\w+)([^<]+?)\/>/g, '<$1$2></$1>') + '</svg>'

      // transplant nodes
      var svgRoot = well.firstChild as Element;
      for (var i = 0, il = svgRoot.childNodes.length; i < il; i++)
        container.appendChild(svgRoot.firstChild as ChildNode)

      return container;
    }
  },

  translate: function(node: SVGElement, x: number, y: number): SVGElement {
    node.setAttribute('transform', 'translate(' + x + ',' + y + ')');
    return node;
  },

  scale: function(node: SVGElement, sx: number, sy: number): SVGElement {
    node.setAttribute('transform', 'scale(' + sx + ',' + sy + ')');
    return node;
  }
}

export var TextMeasuringStrategy = {
  // shapes
  Svg:    0,
  Canvas: 1
};

/*
 * ChantContext
 */
export class ChantContext {

  textMeasuringStrategy: number;
  defs: Record<string, unknown>;
  lyricTextSize: number;
  lyricTextFont: string;
  lyricTextColor: string;
  dropCapTextSize: number;
  dropCapTextFont: string;
  dropCapTextColor: string;
  annotationTextSize: number;
  annotationTextFont: string;
  annotationTextColor: string;
  glyphPunctumWidth: number;
  glyphPunctumHeight: number;
  glyphScaling: number;
  staffInterval: number;
  staffLineWeight: number;
  neumeLineWeight: number;
  dividerLineWeight: number;
  episemaLineWeight: number;
  // Clef instance (Exsurge.Chant.ts); left untyped here to avoid a circular
  // type dependency, since Drawing.ts sits below Chant.ts in the module graph.
  activeClef: any;
  neumeLineColor: string;
  staffLineColor: string;
  dividerLineColor: string;
  defaultLanguage: Latin;
  canvas: HTMLCanvasElement;
  canvasCtxt: CanvasRenderingContext2D;
  pixelRatio: number;
  svgTextMeasurer: SVGSVGElement | undefined;
  hyphenWidth: number;
  minLyricWordSpacing: number;
  intraNeumeSpacing: number;
  syllableConnector: string;
  drawGuides: boolean;
  drawDebuggingBounds: boolean;
  // notation elements being laid out (Exsurge.Chant.ts); only valid during
  // performLayout, same circular-dependency reasoning as activeClef above.
  activeNotations: any;
  // bolted on externally by ChantScore.performLayout/performLayoutAsync (ctxt.notations = ...)
  notations: any[];
  currNotationIndex: number;
  condensingTolerance: number;
  autoColor: boolean;

  constructor(textMeasuringStrategy = TextMeasuringStrategy.Svg) {

    this.textMeasuringStrategy = textMeasuringStrategy;
    this.defs = {};

    // font styles
    this.lyricTextSize = 16; // in points?
    this.lyricTextFont = "'Palatino Linotype', 'Book Antiqua', Palatino, serif";
    this.lyricTextColor = "#000";
    
    this.dropCapTextSize = 64;
    this.dropCapTextFont = this.lyricTextFont;
    this.dropCapTextColor = this.lyricTextColor;
    
    this.annotationTextSize = 13;
    this.annotationTextFont = this.lyricTextFont;
    this.annotationTextColor = this.lyricTextColor;

    // everything depends on the scale of the punctum
    this.glyphPunctumWidth = Glyphs.PunctumQuadratum.bounds.width;
    this.glyphPunctumHeight = Glyphs.PunctumQuadratum.bounds.height;

    // fixme: for now, we just set these using the glyph scales as noted above, presuming a
    // staff line size of 0.5 in. Really what we should do is scale the punctum size based
    // on the text metrics, right? 1 punctum ~ x height size?
    this.glyphScaling = 1.0 / 16.0; 

    this.staffInterval = this.glyphPunctumWidth * this.glyphScaling;

    // setup the line weights for the various elements.
    // we 
    this.staffLineWeight = Math.round(this.glyphPunctumWidth * this.glyphScaling / 8);
    this.neumeLineWeight = this.staffLineWeight; // the weight of connecting lines in the glyphs.
    this.dividerLineWeight = this.neumeLineWeight; // of quarter bar, half bar, etc.
    this.episemaLineWeight = this.neumeLineWeight; // of horizontal episemae

    // for keeping track of the clef
    this.activeClef = null;

    this.neumeLineColor = "#000";
    this.staffLineColor = "#000";
    this.dividerLineColor = "#000";

    this.defaultLanguage = new Latin();

    this.canvas = document.createElement("canvas");
    this.canvasCtxt = this.canvas.getContext("2d")!;

    // calculate the pixel ratio for drawing to a canvas. (older browsers exposed
    // a vendor-prefixed backingStorePixelRatio to correct for this; all current
    // browsers report devicePixelRatio directly, so no correction is needed.)
    this.pixelRatio = window.devicePixelRatio || 1.0;

    this.canvasCtxt.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    if(textMeasuringStrategy === TextMeasuringStrategy.Svg) {
      this.svgTextMeasurer = QuickSvg.svg(1,1);
      this.svgTextMeasurer.setAttribute('id', "TextMeasurer");
      document.body.appendChild(this.svgTextMeasurer);
    }

    // measure the size of a hyphen for the lyrics
    var hyphen = new Lyric(this, "-", LyricType.SingleSyllable);
    this.hyphenWidth = hyphen.bounds.width;

    this.minLyricWordSpacing = this.hyphenWidth;

    this.intraNeumeSpacing = this.staffInterval / 2.0;

    // for connecting neume syllables...
    this.syllableConnector = '-';

    this.drawGuides = false;
    this.drawDebuggingBounds = true;

    // we keep track of where we are in processing notations, so that
    // we can maintain the context for notations to know about.
    //
    // these are only gauranteed to be valid during the performLayout phase!
    this.activeNotations = null;
    this.currNotationIndex = -1;

    // chant notation elements are normally separated by a minimum fixed amount of space
    // on the staff line. It can happen, however, that two text elements are almost close
    // enough to merge, only to be separated much more by the required hyphen (or other
    // connecting string).
    //
    // This tolerance value allows a little bit of flexibility to merge two close lyrical
    // elements, thus bringing the chant notation elements a bit closer than otherwise
    // would be normally allowed.
    //
    // condensing tolerance is a percentage value (0.0-1.0, inclusive) that indicates
    // how much the default spacing can shrink. E.g., a value of 0.80 allows the layout
    // engine to separate two glyphs by only 80% of the normal inter-neume spacing value.
    //
    // fixme: condensing tolerance is not implemented yet!
    this.condensingTolerance = 0.9;

    // if auto color is true, then exsurge tries to automatically colorize
    // some elements of the chant (directives become rubric color, etc.)
    this.autoColor = true;

    this.insertFontsInDoc();
  }

  calculateHeightFromStaffPosition(staffPosition) {
    return -staffPosition * this.staffInterval;
  }

  insertFontsInDoc(): void {

    if (document.getElementById('exsurge-fonts') === null) {
      // create it since it doesn't exist yet.
      var styleElement = document.createElement('style');
      styleElement.id = 'exsurge-fonts';

      styleElement.appendChild(document.createTextNode("@font-face{font-family: 'Exsurge Characters';font-weight: normal;font-style: normal;src: url(" + __exsurgeCharactersFont + ") format('opentype');}"));

      document.head.appendChild(styleElement);
    }
  }

  // returns the next neume starting at this.currNotationIndex, or null
  // if there isn't a neume after this one...
  findNextNeume() {

    if (typeof this.currNotationIndex === 'undefined')
      throw "findNextNeume() called without a valid currNotationIndex set";

    for (var i = this.currNotationIndex + 1; i < this.notations.length; i++) {
      var notation = this.notations[i];

      if (notation.isNeume)
        return notation;
    }

    return null;
  }

  setCanvasSize(width, height) {
    this.canvas.width = width * this.pixelRatio;
    this.canvas.height = height * this.pixelRatio;
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";

    this.canvasCtxt.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }
}


/*
 * ChantLayoutElement
 */
export class ChantLayoutElement {

  bounds: Rect;
  origin: Point;
  selected: boolean;
  highlighted: boolean;

  constructor() {

    this.bounds = new Rect();
    this.origin = new Point(0, 0);

    this.selected = false;
    this.highlighted = false;
  }

  // draws the element on an html5 canvas
  draw(ctxt) {

  }

  // returns svg code for the element, used for printing support
  createSvgFragment(ctxt) {
    throw "ChantLayout Elements must implement createSvgFragment(ctxt)";
  }
}


export class DividerLineVisualizer extends ChantLayoutElement {

  constructor(ctxt, staffPosition0, staffPosition1) {
    super();

    var y0 = ctxt.calculateHeightFromStaffPosition(staffPosition0);
    var y1 = ctxt.calculateHeightFromStaffPosition(staffPosition1);

    if (y0 > y1) {
      var temp = y0;
      y0 = y1;
      y1 = temp;
    }

    this.bounds.x = 0;
    this.bounds.y = y0;
    this.bounds.width = ctxt.dividerLineWeight;
    this.bounds.height = y1 - y0;

    this.origin.x = this.bounds.width / 2;
    this.origin.y = y0;
  }

  draw(ctxt) {
    var canvasCtxt = ctxt.canvasCtxt;

    canvasCtxt.lineWidth = this.bounds.width;
    canvasCtxt.strokeStyle = ctxt.dividerLineColor;

    canvasCtxt.beginPath();
    canvasCtxt.moveTo(this.bounds.x - this.origin.x, this.bounds.y);
    canvasCtxt.lineTo(this.bounds.x - this.origin.x, this.bounds.y + this.bounds.height);
    canvasCtxt.stroke();
  }

  createSvgFragment(ctxt) {

    return QuickSvg.createFragment('rect', {
      'x': this.bounds.x,
      'y': this.bounds.y,
      'width': ctxt.dividerLineWeight,
      'height': this.bounds.height,
      'fill': ctxt.dividerLineColor,
      'class': 'dividerLine'
    });
  }
}

export class NeumeLineVisualizer extends ChantLayoutElement {

  constructor(ctxt, note0, note1, hanging) {
    super();

    var staffPosition0 = note0.staffPosition;
    var staffPosition1 = note1.staffPosition;

    // note0 should be the upper one for our calculations here
    if (staffPosition0 < staffPosition1) {
      var temp = staffPosition0;
      staffPosition0 = staffPosition1;
      staffPosition1 = temp;
    }

    var y0 = ctxt.calculateHeightFromStaffPosition(staffPosition0);
    var y1 = 0;

    if (hanging) {

      // if the difference between the notes is only one, and the upper
      // note is on a line, and the lower note is within the four staff lines,
      // then our hanging line goes past the lower note by a whole
      // staff interval
      if (staffPosition0 - staffPosition1 === 1 && Math.abs(staffPosition0) % 2 === 1 &&
          staffPosition1 > -3)
        staffPosition1--;

      y1 += ctxt.glyphPunctumHeight * ctxt.glyphScaling / 2.2;
    }

    y1 += ctxt.calculateHeightFromStaffPosition(staffPosition1);

    this.bounds.x = 0;
    this.bounds.y = y0;
    this.bounds.width = ctxt.neumeLineWeight;
    this.bounds.height = y1 - y0;

    this.origin.x = 0;
    this.origin.y = 0;
  }

  draw(ctxt) {
    var canvasCtxt = ctxt.canvasCtxt;

    canvasCtxt.lineWidth = this.bounds.width;
    canvasCtxt.strokeStyle = ctxt.neumeLineColor;

    canvasCtxt.beginPath();
    
    // since the canvas context draws strokes centered on the path
    // and neume lines are supposed to be draw left aligned,
    // we need to offset the line by half the line width.
    var x = this.bounds.x + this.bounds.width / 2;

    canvasCtxt.moveTo(x, this.bounds.y);
    canvasCtxt.lineTo(x, this.bounds.y + this.bounds.height);
    canvasCtxt.stroke();
  }

  createSvgFragment(ctxt) {

    return QuickSvg.createFragment('rect', {
      'x': this.bounds.x,
      'y': this.bounds.y,
      'width': ctxt.neumeLineWeight,
      'height': this.bounds.height,
      'fill': ctxt.neumeLineColor,
      'class': 'neumeLine'
    });
  }
}

export class VirgaLineVisualizer extends ChantLayoutElement {

  constructor(ctxt, note) {
    super();

    var staffPosition = note.staffPosition;

    var y0 = ctxt.calculateHeightFromStaffPosition(staffPosition);
    var y1;

    if (Math.abs(staffPosition % 2) === 0)
      y1 = y0 + ctxt.staffInterval * 1.8;
    else
      y1 = y0 + ctxt.staffInterval * 2.7;

    this.bounds.x = 0;
    this.bounds.y = y0;
    this.bounds.width = ctxt.neumeLineWeight;
    this.bounds.height = y1 - y0;

    this.origin.x = 0;
    this.origin.y = 0;
  }

  draw(ctxt) {
    var canvasCtxt = ctxt.canvasCtxt;

    canvasCtxt.lineWidth = this.bounds.width;
    canvasCtxt.strokeStyle = ctxt.neumeLineColor;

    canvasCtxt.beginPath();
    canvasCtxt.moveTo(this.bounds.x, this.bounds.y);
    canvasCtxt.lineTo(this.bounds.x, this.bounds.y + this.bounds.height);
    canvasCtxt.stroke();
  }

  createSvgFragment(ctxt) {

    return QuickSvg.createFragment('rect', {
      'x': this.bounds.x,
      'y': this.bounds.y,
      'width': ctxt.neumeLineWeight,
      'height': this.bounds.height,
      'fill': ctxt.neumeLineColor,
      'class': 'neumeLine'
    });
  }
}

export class GlyphVisualizer extends ChantLayoutElement {

  glyph: any;
  glyphCode: any;
  align: any;

  constructor(ctxt, glyphCode) {
    super();

    this.glyph = null;

    this.setGlyph(ctxt, glyphCode);
  }

  setGlyph(ctxt, glyphCode) {

    if (this.glyphCode === glyphCode)
      return;

    if (typeof glyphCode === 'undefined' || glyphCode === null || glyphCode === "")
      this.glyphCode = GlyphCode.None;
    else
      this.glyphCode = glyphCode;

    this.glyph = Glyphs[this.glyphCode];

    // if this glyph hasn't been used yet, then load it up in the defs section for sharing
    if (!Object.prototype.hasOwnProperty.call(ctxt.defs, this.glyphCode)) {
      var glyphSrc = this.glyph.svgSrc;

      // create the ref
      ctxt.defs[this.glyphCode] = QuickSvg.createFragment('g', {
        id: this.glyphCode,
        'class': 'glyph',
        transform: 'scale(' + ctxt.glyphScaling + ')'
      }, glyphSrc);
    }

    this.align = this.glyph.align;

    this.origin.x = this.glyph.origin.x * ctxt.glyphScaling;
    this.origin.y = this.glyph.origin.y * ctxt.glyphScaling;

    this.bounds.x = 0;
    this.bounds.y = -this.origin.y;
    this.bounds.width = this.glyph.bounds.width * ctxt.glyphScaling;
    this.bounds.height = this.glyph.bounds.height * ctxt.glyphScaling;
  }

  setStaffPosition(ctxt, staffPosition) {
    this.bounds.y += ctxt.calculateHeightFromStaffPosition(staffPosition);
  }

  draw(ctxt) {
    var canvasCtxt = ctxt.canvasCtxt;

    var x = this.bounds.x + this.origin.x;
    var y = this.bounds.y + this.origin.y;
    canvasCtxt.translate(x, y);
    canvasCtxt.scale(ctxt.glyphScaling, ctxt.glyphScaling);

    for (var i = 0; i < this.glyph.paths.length; i++) {
      var path = this.glyph.paths[i];
      canvasCtxt.fillStyle = ctxt.neumeLineColor;
      canvasCtxt.fill(new Path2D(path.data));
    }

    canvasCtxt.scale(1.0 / ctxt.glyphScaling, 1.0 / ctxt.glyphScaling);
    canvasCtxt.translate(-x, -y);
  }

  createSvgFragment(ctxt) {

    return QuickSvg.createFragment('use', {
      'xlink:href': '#' + this.glyphCode,
      x: this.bounds.x + this.origin.x,
      y: this.bounds.y + this.origin.y
    });
  }
}

export class RoundBraceVisualizer extends ChantLayoutElement {

  isAbove: any;
  braceHeight: any;
  bounds: Rect;
  // round braces never actually get one (only curly/"cba" braces do; see
  // CurlyBraceVisualizer below), but createSvgFragment below checks for it
  acuteAccent: GlyphVisualizer | undefined;

  constructor(ctxt, x1, x2, y, isAbove) {
    super();

    if (x1 > x2) {
      // swap the xs
      var temp = x1;
      x1 = x2;
      x2 = temp;
    }

    this.isAbove = isAbove;
    this.braceHeight = ctxt.staffInterval / 2;

    this.bounds = new Rect(x1, y, x2 - x1, this.braceHeight);

    this.origin.x = 0;
    this.origin.y = 0;
  }

  createSvgFragment(ctxt) {
    var fragment = QuickSvg.createFragment('path', {
      'd': this.generatePathString(),
      'stroke': ctxt.neumeLineColor,
      'stroke-width': ctxt.staffLineWeight + 'px',
      'fill': 'none',
      'class': 'brace'
    });

    if (this.acuteAccent) {

      fragment += this.acuteAccent.createSvgFragment(ctxt);

      return QuickSvg.createFragment('g', {
        'class': 'accentedBrace'
      }, fragment);
    } else
      return fragment;
  }

  // returns svg path d string
  generatePathString() {

    var x1 = this.bounds.x;
    var x2 = this.bounds.right();
    var width = this.bounds.width;
    var y, dx, dy;

    if (this.isAbove) {
      y = this.bounds.bottom();
      dx = width / 6;
      dy = -width / 6;
    } else {
      y = this.bounds.y;
      dx = width / 6;
      dy = width / 6;
    }

    //Calculate Control Points of path,
    var cx1 = x1 + dx;
    var cy  = y  + dy;
    var cx2 = x2 - dx;

    // two decimal points should be enough, but if we need more precision, we can
    // up it here.
    var dp = 2;
    return   "M " + x1.toFixed(dp)  + " " + y.toFixed(dp) +
            " C " + cx1.toFixed(dp) + " " + cy.toFixed(dp) + 
            " "   + cx2.toFixed(dp) + " " + cy.toFixed(dp) +
            " "   + x2.toFixed(dp)  + " " + y.toFixed(dp);
  }
}

export class CurlyBraceVisualizer extends ChantLayoutElement {

  isAbove: any;
  braceHeight: any;
  acuteAccent: GlyphVisualizer;
  bounds: any;

  constructor(ctxt, x1, x2, y, isAbove = true, addAcuteAccent = false) {
    super();

    if (x1 > x2) {
      // swap the xs
      var temp = x1;
      x1 = x2;
      x2 = temp;
    }

    this.isAbove = isAbove;
    this.braceHeight = ctxt.staffInterval / 2;

    // y is the actual vertical start of the brace (left hand side)
    // thus for a brace over notes, bounds.y is the bottom of brace,
    // but for a brace under the notes, y is simply the y passed in.
    if (isAbove)
      y -= this.braceHeight;

    var bounds = new Rect(x1, y, x2 - x1, this.braceHeight);

    if (addAcuteAccent && isAbove) {

      this.acuteAccent = new GlyphVisualizer(ctxt, GlyphCode.AcuteAccent);
      this.acuteAccent.bounds.x += bounds.x + (x2 - x1) / 2;
      this.acuteAccent.bounds.y += bounds.y - ctxt.staffInterval / 4;

      bounds.union(this.acuteAccent.bounds);
    }

    this.bounds = bounds;

    this.origin.x = 0;
    this.origin.y = 0;
  }

  createSvgFragment(ctxt) {
    var fragment = QuickSvg.createFragment('path', {
      'd': this.generatePathString(),
      'stroke': ctxt.neumeLineColor,
      'stroke-width': ctxt.staffLineWeight + 'px',
      'fill': 'none',
      'class': 'brace'
    });

    if (this.acuteAccent) {

      fragment += this.acuteAccent.createSvgFragment(ctxt);

      return QuickSvg.createFragment('g', {
        'class': 'accentedBrace'
      }, fragment);
    } else
      return fragment;
  }

  // code below inspired by: https://gist.github.com/alexhornbake
  // optimized for braces that are only drawn horizontally.
  // returns svg path d string
  generatePathString() {

    var q = 0.6; // .5 is normal, higher q = more expressive bracket

    var x1 = this.bounds.x;
    var x2 = this.bounds.right();
    var width = this.bounds.width;
    var y, h;

    if (this.isAbove) {
      y = this.bounds.bottom();
      h = -this.braceHeight;
    } else {
      y = this.bounds.y;
      h = this.braceHeight;
    }

    // calculate Control Points of path
    var qy1 = y  + q * h;
    var qx2 = x1 + .25 * width;
    var qy2 = y  + (1 - q) * h;
    var tx1 = x1 + .5 * width;
    var ty1 = y  + h;
    var qy3 = y  + q * h;
    var qx4 = x1 + .75 * width;
    var qy4 = y  + (1 - q) * h;

    // two decimal points should be enough, but if we need more precision, we can
    // up it here.
    var dp = 2;
    return   "M " + x1.toFixed(dp)  + " " + y.toFixed(dp) +
            " Q " + x1.toFixed(dp) + " " + qy1.toFixed(dp) + " " + qx2.toFixed(dp) + " " + qy2.toFixed(dp) + 
            " T " + tx1.toFixed(dp) + " " + ty1.toFixed(dp) +
            " M " + x2.toFixed(dp)  + " " + y.toFixed(dp) +
            " Q " + x2.toFixed(dp) + " " + qy3.toFixed(dp) + " " + qx4.toFixed(dp) + " " + qy4.toFixed(dp) + 
            " T " + tx1.toFixed(dp) + " " + ty1.toFixed(dp);
  }
}

// a run of text sharing the same inline style (e.g., bold, italic, red, small-caps),
// as produced by TextElement.generateSpansFromText's markup parsing below.
class TextSpan {
  text: string;
  properties: string;

  constructor(text: string, properties?: string) {
    if (typeof properties === 'undefined' || properties === null)
      properties = "";

    this.text = text;
    this.properties = properties;
  }
}

var boldMarkup = "*";
var italicMarkup = "_";
var redMarkup = "^";
var smallCapsMarkup = "%";

class MarkupStackFrame {
  symbol: string;
  startIndex: number;
  properties: string;

  constructor(symbol: string, startIndex: number, properties: string) {
    this.symbol = symbol;
    this.startIndex = startIndex;
    this.properties = properties;
  }

  static createStackFrame(symbol: string, startIndex: number): MarkupStackFrame {

    var properties = "";

    switch(symbol) {
      case boldMarkup:
        properties = 'font-weight:bold;';
        break;
      case italicMarkup:
        properties = 'font-style:italic;';
        break;
      case redMarkup:
        properties = RUBRIC_FILL; // SVG text color is set by the fill property
        break;
      case smallCapsMarkup:
        properties = "font-variant:small-caps;font-feature-settings:'smcp';-webkit-font-feature-settings:'smcp';";
        break;
    }

    return new MarkupStackFrame(symbol, startIndex, properties);
  }
}


// for escaping html strings before they go into the svgs
// adapted from http://stackoverflow.com/a/12034334/5720160
var __subsForTspans = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};

// --- gabc text markup -------------------------------------------------------
//
// Gregorio-style gabc files (e.g. everything downloaded from GregoBase) mark up
// their lyric text with XML-like tags rather than exsurge's own *_^% symbols:
//
//   <b>..</b> bold, <i>..</i> italic, <c>..</c> rubric red, <sc>..</sc> small caps,
//   <ul>..</ul> underline, <tt>..</tt> monospace, <e>..</e> elision (italic)
//   <sp>X</sp>  special characters: V/ R/ A/ (versicle/response/antiphon signs),
//               'ae 'æ 'oe 'œ ae oe (ligatures), * + (rubric asterisk / cross)
//   <v>..</v>   verbatim TeX for gregorio -- meaningless here, dropped
//   <alt>..</alt> text printed above the staff -- not supported yet, dropped
//   <eu>, </eu>, <nlba>, </nlba>, <clear>, <pr>, ... layout hints -- dropped
//
// Unknown tags are dropped (their content is kept), so no raw "<...>" ever
// reaches the rendered score.

// tags whose content is never rendered
const __gabcSkippedContentTags = ['v', 'alt', 'nv', 'gr', 'verb'];

const __gabcStyleTagProperties: Record<string, string> = {
  b: 'font-weight:bold;',
  i: 'font-style:italic;',
  e: 'font-style:italic;',
  c: RUBRIC_FILL, // same rubric red exsurge uses for its own ^red^ markup
  sc: "font-variant:small-caps;font-feature-settings:'smcp';-webkit-font-feature-settings:'smcp';",
  ul: 'text-decoration:underline;',
  tt: 'font-family:monospace;'
};

// <sp> contents that map to a plain character
const __gabcSpecialCharacters: Record<string, string> = {
  "'ae": 'ǽ', "'æ": 'ǽ', "'AE": 'Ǽ', "'Æ": 'Ǽ',
  "'oe": 'œ́', "'œ": 'œ́', "'OE": 'Œ́', "'Œ": 'Œ́',
  'ae': 'æ', 'AE': 'Æ', 'oe': 'œ', 'OE': 'Œ',
  '-': '-'
};

// <sp> contents rendered in rubric red
const __gabcRubricSpecialCharacters: Record<string, string> = {
  '*': '*', '+': '†'
};

// <sp> contents rendered with the ℣/℟/A glyphs of the Exsurge Characters font
// (the same glyphs exsurge's own "V/." markup produces)
const __gabcSignSpecialCharacters: Record<string, string> = {
  'V/': 'V.', 'R/': 'R.', 'A/': 'A.', 'v/': 'V.', 'r/': 'R.', 'a/': 'A.'
};

const __gabcSignProperties = "font-family:'Exsurge Characters';" + RUBRIC_FILL;

const __gabcTagRegex = /<(\/?)([a-zA-Z]+)(?::[^>]*)?>/g;

/** True if the text contains gregorio-style <tag> markup. */
export function hasGabcTextMarkup(text: string): boolean {
  __gabcTagRegex.lastIndex = 0;
  return typeof text === 'string' && __gabcTagRegex.test(text);
}

/**
 * Parses gregorio-style tag markup into styled runs. Returns an array of
 * {text, properties} pairs; never returns raw tags in the run text.
 */
export function parseGabcTextMarkup(text: string): { text: string, properties: string }[] {
  const runs: { text: string, properties: string }[] = [];
  const styleStack: string[] = [];
  let skipDepth = 0;   // inside <v>, <alt>, ...
  let inSpecial = false;
  let special = '';
  let last = 0;
  // the sign glyphs already include their period, and gabc writes one after
  // the tag ("<sp>V/</sp>."): swallow it so we don't print "℣.."
  let swallowPeriod = false;

  const currentProperties = () =>
    styleStack.map(tag => __gabcStyleTagProperties[tag] ?? '').join('');

  const pushRun = (runText: string, extraProperties = '') => {
    if (runText === '')
      return;
    runs.push({ text: runText, properties: currentProperties() + extraProperties });
  };

  const emitText = (chunk: string) => {
    if (skipDepth > 0 || chunk === '')
      return;
    if (swallowPeriod && !inSpecial) {
      swallowPeriod = false;
      if (chunk[0] === '.')
        chunk = chunk.substring(1);
      if (chunk === '')
        return;
    }
    if (inSpecial)
      special += chunk;
    else
      pushRun(chunk);
  };

  const emitSpecial = (content: string) => {
    if (content in __gabcSignSpecialCharacters) {
      pushRun(__gabcSignSpecialCharacters[content], __gabcSignProperties);
      swallowPeriod = true;
    }
    else if (content in __gabcRubricSpecialCharacters)
      pushRun(__gabcRubricSpecialCharacters[content], RUBRIC_FILL);
    else if (content in __gabcSpecialCharacters)
      pushRun(__gabcSpecialCharacters[content]);
    else
      pushRun(content); // unknown special: show its content as-is
  };

  __gabcTagRegex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = __gabcTagRegex.exec(text))) {
    emitText(text.substring(last, match.index));
    last = match.index + match[0].length;

    const closing = match[1] === '/';
    const tag = match[2].toLowerCase();

    if (__gabcSkippedContentTags.indexOf(tag) >= 0) {
      skipDepth = closing ? Math.max(0, skipDepth - 1) : skipDepth + 1;
    } else if (skipDepth > 0) {
      continue;
    } else if (tag === 'sp') {
      if (closing && inSpecial) {
        inSpecial = false;
        emitSpecial(special);
      } else if (!closing) {
        inSpecial = true;
        special = '';
      }
    } else if (tag in __gabcStyleTagProperties) {
      if (!closing) {
        styleStack.push(tag);
      } else {
        const index = styleStack.lastIndexOf(tag);
        if (index >= 0)
          styleStack.splice(index, 1);
      }
    }
    // any other tag (eu, nlba, clear, pr, ...) is a layout hint: drop it
  }

  emitText(text.substring(last));
  if (inSpecial)
    emitSpecial(special); // unclosed <sp>: still don't lose the content

  return runs;
}

export class TextElement extends ChantLayoutElement {

  fontFamily: any;
  fontSize: any;
  textAnchor: any;
  dominantBaseline: any;
  text: string;
  spans: any[];

  constructor(ctxt, text, fontFamily, fontSize, textAnchor) {
    super();

    // set these to some sane values for now...
    this.bounds.x = 0;
    this.bounds.y = 0;
    this.bounds.width = 0;
    this.bounds.height = 0;
    this.origin.x = 0;
    this.origin.y = 0;

    this.fontFamily = fontFamily;
    this.fontSize = fontSize;
    this.textAnchor = textAnchor;
    this.dominantBaseline = 'baseline'; // default placement

    this.generateSpansFromText(ctxt, text);

    this.recalculateMetrics(ctxt);
  }

  generateSpansFromText(ctxt, text) {

    this.text = "";
    this.spans = [];

    // save ourselves a lot of grief for a very common text:
    if (text === "*" || text === "†") {
      this.spans.push(new TextSpan(text));
      return;
    }

    // gregorio-style <tag> markup (GregoBase files) takes precedence over
    // exsurge's own *_^% markup, whose symbols are literal text in such files
    if (hasGabcTextMarkup(text)) {
      for (const run of parseGabcTextMarkup(text)) {
        this.text += run.text;
        this.spans.push(new TextSpan(run.text, run.properties));
      }
      return;
    }

    var markupStack: MarkupStackFrame[] = [];
    var spanStartIndex = 0;

    var filterFrames = (frame: MarkupStackFrame) => frame.symbol === markupSymbol;

    // closeSpan below is a plain function (not an arrow), so it needs `this` captured via closure
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var that = this;
    var closeSpan = function (spanText: string, extraProperties?: string) {
      if (spanText === "")
        return;

      that.text += spanText;

      var properties = "";
      for (var i = 0; i < markupStack.length; i++)
        properties += markupStack[i].properties;

      if (extraProperties)
        properties = properties + extraProperties;

      that.spans.push(new TextSpan(spanText, properties));
    };

    var markupRegex = /(\*|_|\^|%|[ARVarv]\/\.)/g;

    var match: RegExpExecArray | null = null;
    while ((match = markupRegex.exec(text))) {

      var markupSymbol = match[0];

      // non-matching symbols first
      if (markupSymbol === "A/." || markupSymbol === "R/." || markupSymbol === "V/." ||
          markupSymbol === "a/." || markupSymbol === "r/." || markupSymbol === "v/.") {
        closeSpan(text[match.index] + ".", "font-family:'Exsurge Characters';" + RUBRIC_FILL);
      } else if (markupStack.length === 0) {
        // otherwise we're dealing with matching markup delimeters
        // if this is our first markup frame, then just create an inline for preceding text and push the stack frame
        closeSpan(text.substring(spanStartIndex, match.index));
        markupStack.push(MarkupStackFrame.createStackFrame(markupSymbol, match.index));
      } else {

        if (markupStack[markupStack.length - 1].symbol === markupSymbol) {
          // group close
          closeSpan(text.substring(spanStartIndex, match.index));
          markupStack.pop();
        } else if (markupStack.filter(filterFrames).length > 0) {
          // trying to open a recursive group (or forgot to close a previous group)
          // in either case, we just unwind to the previous stack frame
          spanStartIndex = markupStack[markupStack.length - 1].startIndex;
          markupStack.pop();
          continue;
        } else {
          // group open
          closeSpan(text.substring(spanStartIndex, match.index));
          markupStack.push(MarkupStackFrame.createStackFrame(markupSymbol, match.index));
        }
      }

      // advance the start index past the current markup
      spanStartIndex = match.index + markupSymbol.length;
    }

    // if we finished matches, and there is still some text left, create one final run
    if (spanStartIndex < text.length)
      closeSpan(text.substring(spanStartIndex, text.length));

    // if after all of that we still didn't create any runs, then just add the entire text
    // string itself as a run
    if (this.spans.length === 0)
      closeSpan(text);
  }

  measureSubstring(ctxt, length?: number) {
    if(length === 0) return 0;
    if(!length) length = Infinity;
    var canvasCtxt = ctxt.canvasCtxt;
    var baseFont = this.fontSize + "px " + this.fontFamily;
    var width = 0;
    var subStringLength = 0;
    for (var i = 0; i < this.spans.length; i++) {
      var font = '',
          span = this.spans[i],
          myText = span.text.slice(0, length - subStringLength);
      if(span.properties.indexOf('font-style:italic;') >= 0) font += 'italic ';
      if(span.properties.indexOf("font-variant:small-caps;") >= 0) font += 'small-caps ';
      if(span.properties.indexOf('font-weight:bold;') >= 0) font += 'bold ';
      font += baseFont;
      canvasCtxt.font = font;
      var metrics = canvasCtxt.measureText(myText, this.bounds.x, this.bounds.y);
      width += metrics.width;
      subStringLength += myText.length;
      if(subStringLength === length) break;
    }
    return width;
  }

  recalculateMetrics(ctxt) {

    this.bounds.x = 0;
    this.bounds.y = 0;

    this.bounds.x = 0;
    this.bounds.y = 0;
    
    this.origin.x = 0;
  
    if(ctxt.textMeasuringStrategy === TextMeasuringStrategy.Svg) {
      var xml = '<svg xmlns="http://www.w3.org/2000/svg">' + this.createSvgFragment(ctxt) + '</svg>';
      var doc = new DOMParser().parseFromString(xml, 'application/xml');
      
      while(ctxt.svgTextMeasurer.firstChild)
        ctxt.svgTextMeasurer.firstChild.remove();

      ctxt.svgTextMeasurer.appendChild(ctxt.svgTextMeasurer.ownerDocument.importNode(doc.documentElement, true).firstChild);

      var bbox = ctxt.svgTextMeasurer.firstChild.getBBox();
      this.bounds.width = bbox.width;
      this.bounds.height = bbox.height;
      this.origin.y = -bbox.y; // offset to baseline from top
    } else if(ctxt.textMeasuringStrategy === TextMeasuringStrategy.Canvas) {
      this.bounds.width = this.measureSubstring(ctxt);
      this.bounds.height = this.fontSize * 1.2;
      this.origin.y = this.fontSize;
    }
  }

  getCssClasses() {
    return "";
  }

  getExtraStyleProperties(ctxt) {
    return "";
  }

  static escapeForTspan(string) {
    return String(string).replace(/[&<>]/g, function (s) {
      return __subsForTspans[s];
    });
  }

  draw(ctxt) {

    var canvasCtxt = ctxt.canvasCtxt;

    if (this.textAnchor === 'middle')
      canvasCtxt.textAlign = 'center';
    else
      canvasCtxt.textAlign = 'start';

    canvasCtxt.font = this.fontSize + "px " + this.fontFamily;

    for (var i = 0; i < this.spans.length; i++)
      canvasCtxt.fillText(this.spans[i].text, this.bounds.x, this.bounds.y);
  }

  createSvgFragment(ctxt) {

    var spans = "";

    for (var i = 0; i < this.spans.length; i++) {
      var options = {};

      if (this.spans[i].properties)
        options['style'] = this.spans[i].properties;

      spans += QuickSvg.createFragment('tspan', options, TextElement.escapeForTspan(this.spans[i].text));
    }

    var styleProperties = "font-family:" + this.fontFamily +
      ";font-size:" + this.fontSize + "px" +
      ";font-kerning:normal;" +
      this.getExtraStyleProperties(ctxt);

    return QuickSvg.createFragment('text', {
      'x': this.bounds.x,
      'y': this.bounds.y,
      'class': this.getCssClasses().trim(),
      'text-anchor': this.textAnchor,
      'dominant-baseline': this.dominantBaseline,
      'style': styleProperties
    }, spans);
  }
}

export var LyricType = {
  SingleSyllable: 0,
  BeginningSyllable: 1,
  MiddleSyllable: 2,
  EndingSyllable: 3,

  Directive: 4 // for asterisks, "ij." elements, or other performance notes.
};

export class Lyric extends TextElement {

  originalText: any;
  lyricType: any;
  centerStartIndex: number;
  centerLength: any;
  needsConnector: boolean;
  language: any;
  lastSpanText: any;
  lastSpanTextWithConnector: any;
  widthWithoutConnector: any;
  textWithConnector: any;
  widthWithConnector: any;
  // bolted on externally by Exsurge.Gabc.ts's makeLyric()
  elidesToNext: boolean;
  constructor(ctxt, text, lyricType) {
    super(ctxt, text, ctxt.lyricTextFont, ctxt.lyricTextSize, 'start');

    // save the original text in case we need to later use the lyric
    // in a dropcap...
    this.originalText = text;

    if (typeof lyricType === 'undefined' || lyricType === null || lyricType === "")
      this.lyricType = LyricType.SingleSyllable;
    else
      this.lyricType = lyricType;

    // Lyrics keep track of how to center them on notation elements.
    // centerTextIndex is the index in this.text where the centering starts,
    // centerLength is how many characters comprise the center point.
    // performLayout will do the processing
    this.centerStartIndex = -1;
    this.centerLength = this.text.length; // plain text, without any markup tags

    this.needsConnector = false;

    // Lyrics can have their own language defined, which affects the alignment
    // of the text with the notation element
    this.language = null;
  }

  allowsConnector() {
    return this.lyricType === LyricType.BeginningSyllable ||
            this.lyricType === LyricType.MiddleSyllable;
  }

  setNeedsConnector(needs) {
    if (needs === true) {
      this.needsConnector = true;
      this.bounds.width = this.widthWithConnector;

      if (this.spans.length > 0)
        this.spans[this.spans.length - 1].text = this.lastSpanTextWithConnector;
    } else {
      this.needsConnector = false;
      this.bounds.width = this.widthWithoutConnector;

      if (this.spans.length > 0)
        this.spans[this.spans.length - 1].text = this.lastSpanText;
    }
  }

  generateSpansFromText(ctxt, text) {
    super.generateSpansFromText(ctxt, text);

    if (this.spans.length > 0) {
      this.lastSpanText = this.spans[this.spans.length - 1].text;
      this.lastSpanTextWithConnector = this.lastSpanText + ctxt.syllableConnector;
    } else {
      this.lastSpanText = "";
      this.lastSpanTextWithConnector = "";
    }
  }

  recalculateMetrics(ctxt) {
    super.recalculateMetrics(ctxt);

    this.widthWithoutConnector = this.bounds.width;
    this.textWithConnector = this.text + ctxt.syllableConnector;

    this.widthWithConnector = this.bounds.width + ctxt.hyphenWidth;

    var activeLanguage = this.language || ctxt.defaultLanguage;

    // calculate the point where the text lines up to the staff notation
    // and offset the rect that much. By default we just center the text,
    // but the logic below allows for smarter lyric alignment based
    // on manual override or language control.
    var offset = this.widthWithoutConnector / 2, x1, x2;

    // some simple checks for sanity, and disable manual centering if the numbers are bad
    if (this.centerStartIndex >= 0 && (this.centerStartIndex >= this.text.length ||
      this.centerLength < 0 ||
      this.centerStartIndex + this.centerLength > this.text.length))
      this.centerStartIndex = -1;

    if (this.text.length === 0) {
      // if we have no text to work with, then there's nothing to do!
    } else if (this.centerStartIndex >= 0) {
      // if we have manually overriden the centering logic for this lyric,
      // then always use that.
      if(ctxt.textMeasuringStrategy === TextMeasuringStrategy.Svg) {
        // svgTextMeasurer still has the current lyric in it...
        x1 = ctxt.svgTextMeasurer.firstChild.getSubStringLength(0, this.centerStartIndex);
        x2 = ctxt.svgTextMeasurer.firstChild.getSubStringLength(0, this.centerStartIndex + this.centerLength);
      } else if(ctxt.textMeasuringStrategy === TextMeasuringStrategy.Canvas) {
        x1 = this.measureSubstring(ctxt, this.centerStartIndex);
        x2 = this.measureSubstring(ctxt, this.centerStartIndex + this.centerLength);
      }
      offset = x1 + (x2 - x1) / 2;
    } else {

      // if it's a directive with no manual centering override, then
      // just center the text.
      if (this.lyricType !== LyricType.Directive) {

        // Non-directive elements are lined up to the chant notation based on vowel segments,
        var result = activeLanguage.findVowelSegment(this.text, 0);
      
        if (result.found === true) {
          if(ctxt.textMeasuringStrategy === TextMeasuringStrategy.Svg) {
            // svgTextMeasurer still has the current lyric in it...
            x1 = ctxt.svgTextMeasurer.firstChild.getSubStringLength(0, result.startIndex);
            x2 = ctxt.svgTextMeasurer.firstChild.getSubStringLength(0, result.startIndex + result.length);
          } else if(ctxt.textMeasuringStrategy === TextMeasuringStrategy.Canvas) {
            x1 = this.measureSubstring(ctxt, result.startIndex);
            x2 = this.measureSubstring(ctxt, result.startIndex + result.length);
          }
          offset = x1 + (x2 - x1) / 2;
        }
      }
    }

    this.bounds.x = -offset;
    this.bounds.y = 0;

    this.origin.x = offset;

    this.bounds.width = this.widthWithoutConnector;
    this.bounds.height = ctxt.lyricTextSize;
  }

  generateDropCap(ctxt) {

    // with gregorio-style markup the tags would end up split by the substring
    // calls below, so work on the plain text instead (its styling is lost, which
    // is fine for the first syllable of a chant)
    var sourceText = hasGabcTextMarkup(this.originalText) ? this.text : this.originalText;

    var dropCap = new DropCap(ctxt, sourceText.substring(0, 1));

    // if the dropcap is a single character syllable (vowel) that is the
    // beginning of the word, then we use a hyphen in place of the lyric text
    // and treat it as a single syllable.
    if (sourceText.length === 1) {
      this.generateSpansFromText(ctxt, ctxt.syllableConnector);
      this.centerStartIndex = -1;
      this.lyricType = LyricType.SingleSyllable;
    } else {
      this.generateSpansFromText(ctxt, sourceText.substring(1));
      this.centerStartIndex--; // lost a letter, so adjust centering accordingly
    }

    return dropCap;
  }

  getCssClasses() {

    var classes = "lyric ";

    if (this.lyricType === LyricType.Directive)
      classes += "directive ";

    return classes + super.getCssClasses();
  }

  getExtraStyleProperties(ctxt) {
    var props = super.getExtraStyleProperties(ctxt);

    if (this.lyricType === LyricType.Directive && ctxt.autoColor === true)
      props += RUBRIC_FILL;

    return props;
  }

  createSvgFragment(ctxt) {
    if (this.spans.length > 0) {
      if (this.needsConnector)
        this.spans[this.spans.length - 1].text = this.lastSpanTextWithConnector;
      else
        this.spans[this.spans.length - 1].text = this.lastSpanText;
    }

    return super.createSvgFragment(ctxt);
  }
}

export class DropCap extends TextElement {

  padding: any;

  /**
   * @param {String} text
   */
  constructor(ctxt, text) {
    super(ctxt, text, ctxt.dropCapTextFont, ctxt.dropCapTextSize, 'middle');

    this.padding = ctxt.staffInterval * 2;
  }

  getCssClasses() {
    return "dropCap " + super.getCssClasses();
  }
}

export class Annotation extends TextElement {

  padding: any;
  dominantBaseline: any;

  /**
   * @param {String} text
   */
  constructor(ctxt, text) {
    super(ctxt, text, ctxt.annotationTextFont, ctxt.annotationTextSize, 'middle');
    this.padding = ctxt.staffInterval;
    this.dominantBaseline = 'hanging'; // so that annotations can be aligned at the top.
  }

  getCssClasses() {
    return "annotation " + super.getCssClasses();
  }
}



export class ChantNotationElement extends ChantLayoutElement {

  leadingSpace: number;
  trailingSpace: any;
  keepWithNext: boolean;
  needsLayout: boolean;
  lyrics: any[];
  score: any;
  line: any;
  visualizers: any[];
  declare bounds: any;

  constructor() {
    super();

    //double
    this.leadingSpace = 0.0;
    this.trailingSpace = -1; // if less than zero, this is automatically calculated at layout time
    this.keepWithNext = false;
    this.needsLayout = true;

    this.lyrics = [];

    this.score = null; // the ChantScore
    this.line = null; // the ChantLine

    this.visualizers = [];
  }

  hasLyrics() {
    if (this.lyrics.length !== 0)
      return true;
    else
      return false;
  }

  getLyricLeft(index) {
    // warning: no error checking on index or on whether lyric[index] is valid
    return this.bounds.x + this.lyrics[index].bounds.x;
  }

  getAllLyricsLeft() {
    if (this.lyrics.length === 0)
      return this.bounds.right();

    var x = Number.MAX_VALUE;
    for (var i = 0; i < this.lyrics.length; i++) {
      if (this.lyrics[i])
        x = Math.min(x, this.lyrics[i].bounds.x);
    }

    return this.bounds.x + x;
  }

  getLyricRight(index) {
    // warning: no error checking on index or on whether lyric[index] is valid
    return this.bounds.x + this.lyrics[index].bounds.x + this.lyrics[index].bounds.width;
  }

  getAllLyricsRight() {
    if (this.lyrics.length === 0)
      return this.bounds.x;

    var x = Number.MIN_VALUE;
    for (var i = 0; i < this.lyrics.length; i++) {
      if (this.lyrics[i])
        x = Math.max(x, this.lyrics[i].bounds.x + this.lyrics[i].bounds.width);
    }

    return this.bounds.x + x;
  }

  // used by subclasses while building up the chant notations.
  addVisualizer(chantLayoutElement) {
    if (this.bounds.isEmpty())
      this.bounds = chantLayoutElement.bounds.clone();
    else
      this.bounds.union(chantLayoutElement.bounds);

    this.visualizers.push(chantLayoutElement);
  }

  // same as addVisualizer, except the element is unshifted to the front
  // of the visualizer array rather than the end. This way, some
  // visualizers can be placed behind the others...ledger lines for example.
  prependVisualizer(chantLayoutElement) {
    if (this.bounds.isEmpty())
      this.bounds = chantLayoutElement.bounds.clone();
    else
      this.bounds.union(chantLayoutElement.bounds);

    this.visualizers.unshift(chantLayoutElement);
  }

  // chant notation elements are given an opportunity to perform their layout via this function.
  // subclasses should call this function first in overrides of this function.
  // on completion, exsurge presumes that the bounds, the origin, and the fragment objects are
  // all valid and prepared for higher level layout.
  performLayout(ctxt) {

    if (this.trailingSpace < 0)
      this.trailingSpace = ctxt.intraNeumeSpacing * 4;

    // reset the bounds and the staff notations before doing a layout
    this.visualizers = [];
    this.bounds = new Rect(Infinity, Infinity, -Infinity, -Infinity);

    for (var i = 0; i < this.lyrics.length; i++)
      this.lyrics[i].recalculateMetrics(ctxt);
  }

  // some subclasses have internal dependencies on other notations (for example,
  // a custos can depend on a later neume which it uses to set its height).
  // subclasses can override this function so that when the notations are 
  // altered, the subclass can correctly invalidate (and later restore) its own
  // depedencies
  resetDependencies() {

  }

  // a helper function for subclasses to call after they are done performing layout...
  finishLayout(ctxt) {

    this.bounds.x = 0;

    for (var i = 0; i < this.lyrics.length; i++)
      this.lyrics[i].bounds.x = this.origin.x - this.lyrics[i].origin.x;

    this.needsLayout = false;
  }

  draw(ctxt) {

    var canvasCtxt = ctxt.canvasCtxt;
    canvasCtxt.translate(this.bounds.x, 0);

    for (var i = 0; i < this.visualizers.length; i++)
      this.visualizers[i].draw(ctxt);

    for (i = 0; i < this.lyrics.length; i++)
      this.lyrics[i].draw(ctxt);

    canvasCtxt.translate(-this.bounds.x, 0);
  }

  createSvgFragment(ctxt) {
    var inner = "";

    for (var i = 0; i < this.visualizers.length; i++)
      inner += this.visualizers[i].createSvgFragment(ctxt);

    for (i = 0; i < this.lyrics.length; i++)
      inner += this.lyrics[i].createSvgFragment(ctxt);

    return QuickSvg.createFragment('g', {
      // this.constructor.name will not be the same after being mangled by UglifyJS
      'class': 'ChantNotationElement ' + this.constructor.name,
      'transform': 'translate(' + this.bounds.x + ',' + 0 + ')'
    }, inner);
  }
}
