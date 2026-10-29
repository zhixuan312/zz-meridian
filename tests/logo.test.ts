// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { logoSource } from '../src/lib/logo.ts';

describe('logoSource', () => {
  it('accepts a root-relative SVG under public', () => {
    expect(logoSource('/logo.svg')).toBe('/logo.svg');
    expect(logoSource('/brand/mark-2.svg')).toBe('/brand/mark-2.svg');
  });
  it('refuses everything else', () => {
    for (const bad of ['logo.svg', 'https://x.dev/logo.svg', '//x.dev/logo.svg', '/../logo.svg', '/a/../logo.svg', '/logo.png', '/logo.svg?x=1', '', 42, undefined, null]) expect(logoSource(bad), String(bad)).toBeNull();
  });
});
