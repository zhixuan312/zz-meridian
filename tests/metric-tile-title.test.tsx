// @vitest-environment node
// A Metric tile's label is cut with an ellipsis when it is longer than the tile is wide; the compact tile kept the whole
// of it in its title and the standard tile did not, so the audit failed a project through a managed file (#51).
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { MetricTile } from '@/components/patterns/metric-tile';

it("keeps a long label's whole in its title on the standard tile", () => {
  const label = 'Median hours until abandoned work stopped';
  const html = renderToStaticMarkup(<MetricTile label={label} value={12} />);
  const h2 = /<h2\b[^>]*>/.exec(html)?.[0] ?? '';
  expect(h2).toContain('truncate');
  expect(h2).toContain(`title="${label}"`);
});
