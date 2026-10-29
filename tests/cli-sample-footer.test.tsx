// Named cli-* so the payload leaves it out: it is about the sample's footer, which a product replaces.
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** The footer, with the navigation the project has: the template's, or one brand.ts --no-atlas left without the Atlas. */
async function footer(atlas: boolean) {
  vi.resetModules();
  vi.doMock('@/app.config', async (orig) => {
    const real = await orig<typeof import('@/app.config')>();
    return { ...real, nav: real.nav.map((g) => ({ ...g, items: g.items.filter((i) => atlas || !i.href.startsWith('/system')) })) };
  });
  const { SampleFooter } = await import('@/views/sample-footer');
  return render(<SampleFooter services={async () => null} />).container;
}
afterEach(() => vi.doUnmock('@/app.config'));

describe("the sample's footer", () => {
  it('links to the Design system while the navigation has it', async () => {
    expect((await footer(true)).querySelector('a[href="/system"]')).toHaveTextContent('Design system');
  });
  it('draws no link to a Design system the project does not have', async () => {
    const c = await footer(false);
    expect(c.querySelector('a[href="/system"]')).toBeNull();
    expect(c.textContent).toMatch(/^© /);
  });
});
