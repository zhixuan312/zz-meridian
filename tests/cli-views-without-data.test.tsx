// Named cli-* so the payload leaves it out: it draws the sample's own views, which a product replaces.
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { readRequests, REQUEST_PAGE } from '@/data/requests';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { CustomersView } from '@/views/customers';
import { HomeBody } from '@/views/home';
import { KeysView } from '@/views/keys';
import { MembersView } from '@/views/members';
import { NowBody } from '@/views/now';
import { ReleasesView } from '@/views/releases';
import { RequestsView } from '@/views/requests';
import { RevenueBody } from '@/views/revenue';
import { ServicesBody } from '@/views/services';
import { TestsView } from '@/views/tests';
import { TicketsView } from '@/views/tickets';
import { UsageBody } from '@/views/usage';
import { homeData, type HomeReads } from '@/logic/home-parts';
import { nowData, type NowReads } from '@/logic/now-parts';
import { revenueData, type RevenueReads } from '@/logic/revenue-parts';
import { usageData, type UsageReads } from '@/logic/usage-parts';

/**
 * Every view, drawn for a product with nothing in it yet and for one whose store could not be read. The sample is full
 * by construction, so these are the states an adopter meets first, on the first day and on the first outage, and four
 * of fourteen views were drawn without data anywhere (tests/empty-views.test.tsx). Each must draw, say what it is in
 * words, and draw no figure as if there were one: no number that is not one, no signed zero, no zero amount.
 */
const NOW = DEMO_NOW.toISOString();
const UPDATED = DEMO_UPDATED_AT.toISOString();
const none = async () => { throw new Error('not in this test'); };
const totals = { requests: 0, errorRate: 0, p95: 0, revenue: 0 };
const days = { series: [], previous: [], totals: { current: totals, previous: null }, running: null };

/** The reads of a page, every one empty, or every one unread (null). */
const homeReads = (empty: boolean) => ({ period: '30d', day: null, days: empty ? days : null, history: empty ? [] : null, customers: empty ? [] : null, services: empty ? [] : null, incidents: empty ? [] : null, releases: empty ? [] : null, runs: empty ? [] : null, tickets: empty ? [] : null, usage: empty ? [] : null, models: empty ? [] : null, compute: empty ? [] : null, activity: empty ? [] : null, alerts: empty ? [] : null, updatedAt: UPDATED, now: NOW }) as unknown as HomeReads;
const usageReads = (empty: boolean) => ({ period: '30d', day: null, days: empty ? { series: [], totals: { current: totals, previous: null }, running: null } : null, history: empty ? [] : null, usage: empty ? [] : null, models: empty ? [] : null, endpoints: empty ? [] : null, regions: empty ? [] : null, customers: empty ? [] : null, updatedAt: UPDATED, now: NOW }) as unknown as UsageReads;
const revenueReads = (empty: boolean): RevenueReads => ({ period: '30d', days: empty ? { series: [], totals: { current: totals, previous: null }, running: null } : null, history: empty ? [] : null, customers: empty ? [] : null, usage: empty ? [] : null, models: empty ? [] : null, regions: empty ? [] : null, updatedAt: UPDATED, now: NOW });
const nowReads = (empty: boolean): NowReads => ({ services: empty ? [] : null, incidents: empty ? [] : null, releases: empty ? [] : null, runs: empty ? [] : null, history: empty ? [] : null, usage: empty ? [] : null, models: empty ? [] : null, compute: empty ? [] : null, endpoints: empty ? [] : null, tickets: empty ? [] : null, activity: empty ? [] : null, reader: 'members_1', updatedAt: UPDATED, now: NOW });

const EMPTY: Record<string, () => Promise<ReactElement>> = {
  home: async () => <HomeBody {...homeData(homeReads(true))} />,
  usage: async () => <UsageBody {...usageData(usageReads(true))} />,
  revenue: async () => <RevenueBody {...revenueData(revenueReads(true))} />,
  now: async () => <NowBody {...nowData(nowReads(true))} />,
  services: async () => <ServicesBody services={[]} incidents={{ open: [], resolved: [] }} head={{ title: null, facts: [] }} updatedAt={NOW} now={NOW} />,
  customers: async () => <CustomersView rows={[]} />,
  keys: async () => <KeysView rows={[]} now={NOW} createKey={none} revokeKey={none} />,
  members: async () => <MembersView rows={[]} now={NOW} actions={{ invite: none, setStatus: none, remove: none, assignRole: none } as never} access={{}} roles={[]} />,
  tickets: async () => <TicketsView rows={[]} now={NOW} services={[]} assignees={[]} createTicket={none as never} updateTicket={none as never} />,
  tests: async () => <TestsView rows={[]} now={NOW} />,
  releases: async () => <ReleasesView rows={[]} now={NOW} />,
  requests: async () => {
    // No filter, and nothing: the summary over no rows (a search no request matches) with the page's unfiltered state.
    const { summary } = await readRequests({ q: 'no request is called this' }, { customers: true });
    const { state } = await readRequests({}, { customers: true });
    return <RequestsView rows={[]} total={0} summary={summary} state={state} pageSize={REQUEST_PAGE} updatedAt={UPDATED} now={NOW} />;
  },
};
const UNREAD: Record<string, () => ReactElement> = {
  home: () => <HomeBody {...homeData(homeReads(false))} />,
  usage: () => <UsageBody {...usageData(usageReads(false))} />,
  revenue: () => <RevenueBody {...revenueData(revenueReads(false))} />,
  now: () => <NowBody {...nowData(nowReads(false))} />,
};

const draw = (el: ReactElement) => render(<Tooltip.Provider>{el}</Tooltip.Provider>).container;
/** What a person reads: the page's text, without what only a screen reader hears. */
const seen = (c: HTMLElement) => {
  const copy = c.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.sr-only').forEach((n) => n.remove());
  // Each piece of text apart, as a person reads it: textContent runs "0 keys" into "No keys yet" as "keysNo".
  const parts: string[] = [];
  const walk = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.textContent?.trim()) parts.push(n.textContent.trim());
  return parts.join(' ');
};
const NOT_A_FIGURE = /NaN|Infinity|undefined|\bnull\b|\[object|(?<![\w.])[-−](?:\$|€|£)?0(?:\.0+)?(?![\d.])|(?<![\d.,])\$0(?:\.0+)?(?![\d.])/;

describe('every view, for a product with nothing in it yet', () => {
  for (const [name, el] of Object.entries(EMPTY)) {
    it(name, async () => {
      const page = draw(await el());
      const text = seen(page);
      expect(text, `${name}: ${text.slice(0, 300)}`).not.toMatch(NOT_A_FIGURE);
      // No figure drawn as if there were records: a row of zero tiles over "No customers yet" says it twice.
      expect([...page.querySelectorAll('[data-value]')].map((v) => v.closest('[class*="card"]')?.querySelector('h2')?.textContent), name).toEqual([]);
      // It says, in words, that there is nothing yet.
      expect(text, `${name}: ${text.slice(0, 300)}`).toMatch(/\bno\b|\bnothing\b|\bnone\b|not yet|yet\b/i);
    });
  }
});

describe('every view whose store could not be read', () => {
  for (const [name, el] of Object.entries(UNREAD)) {
    it(name, () => {
      const text = seen(draw(el()));
      expect(text, `${name}: ${text.slice(0, 300)}`).not.toMatch(NOT_A_FIGURE);
      expect(text, `${name}: ${text.slice(0, 300)}`).toMatch(/could not be read/i);
    });
  }
});
