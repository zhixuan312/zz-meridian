// Named cli-* so the payload leaves it out: it reads the sample's own pages and their specifications, which a product replaces.
import fs from 'node:fs';
import path from 'node:path';
import { render, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Tooltip } from 'radix-ui';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

import { ConsoleSurface } from '@/components/base/surface';
import { readReleases, readRuns } from '@/data/engineering';
import { invitableRoles, memberAccess } from '@/data/member-mutations';
import { read, readAll } from '@/data/read';
import { readRequests, REQUEST_PAGE } from '@/data/requests';
import { DEMO_UPDATED_AT, payloadsOf, traceOf, type ApiKey, type CustomerRecord, type Member, type RequestRow } from '@/data/sample';
import { readTickets } from '@/data/tickets';
import { CustomerView } from '@/views/customer';
import { CustomersView } from '@/views/customers';
import { customerRow } from '@/logic/customers-context';
import { HomeBody } from '@/views/home';
import { KeysView } from '@/views/keys';
import { MembersView } from '@/views/members';
import { NowBody } from '@/views/now';
import { ReleasesView } from '@/views/releases';
import { RequestView } from '@/views/request';
import { RequestsView } from '@/views/requests';
import { RevenueBody } from '@/views/revenue';
import { ServicesBody } from '@/views/services';
import { TestsView } from '@/views/tests';
import { TicketsView } from '@/views/tickets';
import { customerTool, homeTool, nowTool, revenueTool, servicesTool, usageTool, viewTools } from '@/logic/tools';
import { UsageBody } from '@/views/usage';

/**
 * Each page with a view tool names its protagonist, the card worth asking about, in its specification
 * (`Protagonist: <name>.` under `### What the agent does here`), marks that card `data-protagonist="<name>"`, and the card
 * carries an Ask wherever an agent is listening (FR-42, FR-43, AC-14.5). The fourteen are rendered from the sample as a
 * person with the assistant on sees them: the console's surface hands every Ask to the panel.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const none = async () => { throw new Error('not in this test'); };
const BODIES: Record<string, () => Promise<ReactElement>> = {
  home: async () => <HomeBody {...(await homeTool.read({ period: '30d' })).data} />,
  revenue: async () => <RevenueBody {...(await revenueTool.read({ period: '30d' })).data} />,
  usage: async () => <UsageBody {...(await usageTool.read({ period: '30d' })).data} />,
  now: async () => <NowBody {...(await nowTool.read({})).data} />,
  services: async () => <ServicesBody {...(await servicesTool.read({})).data} />,
  customer: async () => <CustomerView {...(await customerTool.read({ id: 'northwind-labs' })).data} />,
  customers: async () => <CustomersView rows={((await readAll('customers')).rows as CustomerRecord[]).map(customerRow)} />,
  requests: async () => {
    const { rows, total, summary, state, observedAt } = await readRequests({}, { customers: true });
    return <RequestsView rows={rows} total={total} summary={summary} state={state} pageSize={REQUEST_PAGE} updatedAt={DEMO_UPDATED_AT.toISOString()} now={observedAt} />;
  },
  request: async () => {
    const { rows, observedAt } = await read('requests', { limit: 1 });
    const r = rows[0] as RequestRow;
    return <RequestView request={r} trace={traceOf(r)} payloads={payloadsOf(r)} routeP95={null} now={observedAt} replay={none} />;
  },
  members: async () => {
    const { rows, observedAt } = await read('members', { sort: { field: 'joined', dir: 'desc' } });
    const members = rows as Member[];
    const access = Object.fromEntries(await Promise.all(members.map(async (m) => [m.id, await memberAccess(m.id)] as const)));
    return <MembersView rows={members} now={observedAt} actions={{ invite: none, setStatus: none, remove: none, assignRole: none } as never} access={access} roles={await invitableRoles()} />;
  },
  keys: async () => {
    const { rows, observedAt } = await read('keys');
    return <KeysView rows={rows as ApiKey[]} now={observedAt} createKey={none} revokeKey={none} />;
  },
  tickets: async () => {
    const { rows, observedAt } = await readTickets();
    return <TicketsView rows={rows} now={observedAt} services={[]} assignees={[]} createTicket={none as never} updateTicket={none as never} />;
  },
  tests: async () => {
    const { rows, observedAt } = await readRuns();
    return <TestsView rows={rows} now={observedAt} />;
  },
  releases: async () => {
    const { rows, observedAt } = await readReleases();
    return <ReleasesView rows={rows} now={observedAt} />;
  },
};

/** The specification of the page a view renders: `/customers/[id]` is `app/(dashboard)/customers/[id]/README.md`, `/` the home group's. */
function specOf(page: string): string {
  const groups = fs.readdirSync(path.join(ROOT, 'app')).filter((d) => /^\(.+\)$/.test(d));
  for (const g of groups) {
    const base = path.join(ROOT, 'app', g);
    const direct = path.join(base, page, 'README.md');
    if (page !== '/' && fs.existsSync(direct)) return direct;
    if (page === '/') for (const sub of fs.readdirSync(base).filter((d) => /^\(.+\)$/.test(d))) if (fs.existsSync(path.join(base, sub, 'page.tsx'))) return path.join(base, sub, 'README.md');
  }
  throw new Error(`no specification for ${page}`);
}
const protagonistOf = (md: string) => /^### What the agent does here\n[\s\S]*?^Protagonist: (.+)\.$/m.exec(md)?.[1];

afterEach(() => document.body.replaceChildren());

describe("each page's protagonist carries an Ask", () => {
  it('covers every view tool the product declares', () => {
    expect(Object.keys(BODIES).sort()).toEqual(viewTools.map((v) => v.name).sort());
  });

  for (const view of viewTools) {
    it(`${view.name}: the card its specification names is marked and carries an Ask`, async () => {
      const name = protagonistOf(fs.readFileSync(specOf(view.page), 'utf8'));
      expect(name, `the Protagonist line of ${view.page}'s specification`).toBeTruthy();
      const { container } = render(<Tooltip.Provider><ConsoleSurface ask={() => {}}>{await BODIES[view.name]()}</ConsoleSurface></Tooltip.Provider>);
      const marked = [...container.querySelectorAll<HTMLElement>('[data-protagonist]')];
      expect(marked.map((m) => m.getAttribute('data-protagonist')), 'one protagonist, named as the specification names it').toEqual([name]);
      await waitFor(() => expect(marked[0].querySelector('button[aria-label^="Ask: "]'), 'an Ask on the protagonist').toBeTruthy());
    });
  }
});
