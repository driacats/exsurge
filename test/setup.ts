// jsdom implements the DOM but not actual rendering (no real Canvas 2D backend,
// no SVG layout engine), so a couple of APIs exsurge relies on need minimal
// stand-ins here just so the layout/measurement code paths can run in tests
// without throwing. The values returned are not meant to be visually accurate
// -- see test/smoke.test.ts, which only checks that the pipeline completes and
// produces SVG output, not that the measurements are pixel-correct.

const fakeCanvasContext = {
  setTransform() {},
  scale() {},
  translate() {},
  fill() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  clearRect() {},
  measureText(text: string) {
    return { width: String(text).length * 8 };
  },
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
};

HTMLCanvasElement.prototype.getContext = function () {
  return fakeCanvasContext as unknown as CanvasRenderingContext2D;
} as typeof HTMLCanvasElement.prototype.getContext;

if (typeof (SVGElement.prototype as any).getBBox !== 'function') {
  (SVGElement.prototype as any).getBBox = function () {
    return { x: 0, y: 0, width: 10, height: 10 };
  };
}

if (typeof (SVGElement.prototype as any).getSubStringLength !== 'function') {
  (SVGElement.prototype as any).getSubStringLength = function (from: number, to: number) {
    return Math.max(0, to - from) * 8;
  };
}
