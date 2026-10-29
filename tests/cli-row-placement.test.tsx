// Named cli-* so the payload leaves it out: it renders the sample's own pages, which a product replaces.
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it } from 'vitest';

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
    const access = await memberAccess(members.map((m) => m.id));
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

/**
 * A row that places its cards (`2/3` gives its first card two columns, `1/3` its last) places what it holds directly: a
 * child whose display is `contents` draws no box, so the column span lands on nothing and the card beside it takes the
 * room the row meant for it. A page that marks a card in such a row marks a real grid item.
 */
describe('a split row places its cards', () => {
  for (const view of viewTools) {
    it(`${view.name}: no child of a 2/3 or 1/3 row has display contents`, async () => {
      const { container } = render(<Tooltip.Provider><ConsoleSurface ask={() => {}}>{await BODIES[view.name]()}</ConsoleSurface></Tooltip.Provider>);
      for (const row of container.querySelectorAll<HTMLElement>('[data-split="2/3"], [data-split="1/3"]')) {
        for (const child of row.children) expect(child.classList.contains('contents'), `${view.name}: ${child.outerHTML.slice(0, 80)}`).toBe(false);
      }
    });
  }
});
