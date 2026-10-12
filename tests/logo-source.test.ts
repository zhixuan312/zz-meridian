import { describe, expect, test } from 'vitest';
import { logoSource } from '@/lib/logo';

// A brand kit may ship its mark as a bitmap it forbids redrawing: the logo is a local file under public/, an SVG, a PNG
// or a WebP (issue #24). Nothing else about what is accepted changes.
describe('app.logo', () => {
  test('is a root-relative svg, png or webp under public/', () => {
    for (const ok of ['/logo.svg', '/brand/mark.png', '/brand/mark-2x.webp']) expect(logoSource(ok), ok).toBe(ok);
  });

  test('is nothing else: a url, a relative path, a parent segment, a query, another type', () => {
    for (const bad of ['https://x.dev/logo.png', 'logo.png', '/../logo.png', '/logo.png?v=2', '/logo.gif', '/logo.jpg', 42, undefined]) expect(logoSource(bad), String(bad)).toBeNull();
  });
});
