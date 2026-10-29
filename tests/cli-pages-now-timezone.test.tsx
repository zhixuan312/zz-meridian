// Named cli-* so the payload leaves it out: it is about the sample's own Now page, which a product replaces.
import { render } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/engineering',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));
// A product that reports in its own zone: its verification runs are cut into days at that midnight.
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, app: { ...real.app, timezone: 'Asia/Singapore' } };
});

import { NowBody } from '@/views/now';
import { nowTool } from '@/logic/tools';

describe("Now names the product's reporting timezone wherever it names a zone", () => {
  it('in the verification runs a day, never UTC', async () => {
    const { data } = await nowTool.read({});
    const { container } = render(<Tooltip.Provider><NowBody {...data} /></Tooltip.Provider>);
    expect(container.textContent).toMatch(/The last 30 complete days(, and today so far)?, Asia\/Singapore/);
    expect(container.textContent).not.toMatch(/UTC/);
  });
});
