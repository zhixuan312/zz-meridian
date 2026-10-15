// Named cli-* so the payload leaves it out: it reads the sample's own pages, which a product replaces.
import { render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

import { ConsoleSurface } from '@/components/base/surface';
import { CustomerView } from '@/views/customer';
import { HomeBody } from '@/views/home';
import { NowBody } from '@/views/now';
import { RevenueBody } from '@/views/revenue';
import { ServicesBody } from '@/views/services';
import { customerTool, homeTool, nowTool, revenueTool, servicesTool, usageTool } from '@/views/tools';
import { UsageBody } from '@/views/usage';

/** The page as a person with the assistant on sees it: the console's surface hands every Ask to the panel. */
const onConsole = (page: ReactElement) => render(<Tooltip.Provider><ConsoleSurface ask={() => {}}>{page}</ConsoleSurface></Tooltip.Provider>);
/** The card a heading names: from the heading out to the first ancestor that is a card. */
const card = (title: string) => screen.getByRole('heading', { name: title }).closest<HTMLElement>('.card')!;
const asks = async (root: HTMLElement) => within(root).findAllByRole('button', { name: /^Ask: / });

/**
 * Each page's protagonist, the card worth asking about, carries an Ask whose question names what the card shows for the
 * period in view, as Home's revenue card does. An Ask dropped in a rebuild drops the person's way to hand the card to
 * the agent, and nothing else would say so.
 */
describe("each page's protagonist carries an Ask", () => {
  it('Home: its revenue card, as the others follow', async () => {
    const { data } = await homeTool.read({ period: '30d' });
    onConsole(<HomeBody {...data} />);
    const [ask] = await screen.findAllByRole('button', { name: /^Ask: / });
    expect(ask.getAttribute('aria-label')).toMatch(/revenue over the last 30 days/);
  });

  it('Revenue: its revenue by day, by plan', async () => {
    const { data } = await revenueTool.read({ period: '30d' });
    onConsole(<RevenueBody {...data} />);
    const [ask] = await asks(card('Revenue a day by plan'));
    expect(ask.getAttribute('aria-label')).toMatch(/revenue/i);
    expect(ask.getAttribute('aria-label')).toMatch(/last 30 days/);
  });

  it('Usage: its Featured metric, requests', async () => {
    const { data } = await usageTool.read({ period: '90d' });
    onConsole(<UsageBody {...data} />);
    const [ask] = await asks(document.querySelector<HTMLElement>('[data-protagonist="Requests"]')!);
    expect(ask.getAttribute('aria-label')).toMatch(/requests/i);
    expect(ask.getAttribute('aria-label')).toMatch(/last 90 days/);
  });

  it('Now: its services, now', async () => {
    const { data } = await nowTool.read({});
    onConsole(<NowBody {...data} />);
    const [ask] = await asks(card('Services, now'));
    expect(ask.getAttribute('aria-label')).toMatch(/service/i);
  });

  it('Services: its Featured metric, uptime', async () => {
    const { data } = await servicesTool.read({});
    onConsole(<ServicesBody {...data} />);
    const [ask] = await asks(document.querySelector<HTMLElement>('[data-protagonist="Uptime"]')!);
    expect(ask.getAttribute('aria-label')).toMatch(/uptime/i);
  });

  it("A customer's page: its standing", async () => {
    const { data } = await customerTool.read({ id: 'northwind-labs' });
    onConsole(<CustomerView {...data} />);
    const all = await screen.findAllByRole('button', { name: /^Ask: / });
    expect(all.length).toBeGreaterThan(0);
    expect(all[0].getAttribute('aria-label')).toMatch(/Northwind Labs/);
  });
});
