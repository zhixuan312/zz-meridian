// Named cli-* so the payload leaves it out: it reads the sample's own Services page, which a product replaces.
import { render } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/services',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

import { ServicesBody } from '@/views/services';
import { servicesTool } from '@/logic/tools';

/**
 * Services' Featured metric states its uptime over a line that is not uptime: the share of the services operational
 * each day, which falls on a day one service is degraded. A person reads the line from what is on screen, so the card
 * says what it draws in words, not only in the chart's hidden table (scoreboard round 5, W12).
 */
describe("Services' Featured metric says what its line is", () => {
  it('on screen, beside the figure', async () => {
    const { data } = await servicesTool.read({});
    const { container } = render(<Tooltip.Provider><ServicesBody {...data} /></Tooltip.Provider>);
    const card = container.querySelector<HTMLElement>('[data-protagonist="Uptime"]')!;
    const shown = [...card.querySelectorAll<HTMLElement>('*')].filter((el) => !el.closest('table, .sr-only, [aria-hidden="true"]') && el.children.length === 0).map((el) => el.textContent ?? '').join(' ');
    expect(shown).toMatch(/line is the share of the services operational each day/i);
  });
});
