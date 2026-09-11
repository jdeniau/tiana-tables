const SVG_NS = 'http://www.w3.org/2000/svg';

/** rendering at twice the on-screen size keeps the PNG readable once pasted */
const SCALE = 2;

/**
 * A PNG of a nivo chart, as a data URL.
 *
 * nivo has no export of its own: it renders a plain `<svg>`, and getting an
 * image out of it is serializing that node, loading it as an `<img>` — a data
 * URL, since a blob URL would need revoking — and painting it on a canvas.
 *
 * The canvas stays untainted as long as the SVG references nothing external,
 * which holds here: nivo's theme is applied as inline attributes, and the
 * tooltips are HTML siblings of the `<svg>` rather than part of it.
 */
export async function chartToPngDataUrl(
  svg: SVGSVGElement,
  background: string
): Promise<string> {
  const { width, height } = svg.getBoundingClientRect();

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  // the chart is drawn on a transparent ground: without this rect, a chart of
  // a dark theme pasted on a light background is dark text on white
  const ground = document.createElementNS(SVG_NS, 'rect');
  ground.setAttribute('width', '100%');
  ground.setAttribute('height', '100%');
  ground.setAttribute('fill', background);
  clone.insertBefore(ground, clone.firstChild);

  const source = new XMLSerializer().serializeToString(clone);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not get a 2d context to render the chart.');
  }

  context.scale(SCALE, SCALE);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/png');
}
