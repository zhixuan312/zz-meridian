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

import { read, readAll } from '@/data/read';
import { readRequests, REQUEST_PAGE } from '@/data/requests';
import { DEMO_UPDATED_AT, payloadsOf, traceOf, type CustomerRecord, type RequestRow } from '@/data/sample';
import { customerAddress, customerContext } from '@/logic/customer-context';
import { customerRow } from '@/logic/customers-context';
import { requestAddress, requestContext } from '@/logic/request-context';
import { customerTool } from '@/logic/tools';
import { CustomersView } from '@/views/customers';
import { RequestView } from '@/views/request';
import { RequestsView } from '@/views/requests';

/**
 * A record's id is the product's, and the sample's are slugs ("northwind-labs", "req_qmi1vbyi3uqt"), so every link to
 * a record was written `/customers/${id}`. An id holding a slash, a hash, a question mark, a space or a letter outside
 * ASCII then names another address: `/customers/acme/eu` is a page that does not exist, `/requests/r#2` is `/requests/r`.
 * The page reads its id decoded (Next decodes a segment: `/customers/northwind%2Dlabs` draws Northwind Labs), so a link
 * encodes it, and every link to a record, drawn or handed to an agent, must name exactly that record.
 */
const IDS = ['acme/eu', 'r#2', 'what?', 'two words', 'café-1', '100%'];
const none = async () => { throw new Error('not in this test'); };

/** The id each link to `/<collection>/` names, decoded the way the page's segment is. */
function named(container: HTMLElement, collection: string): string[] {
  return [...container.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .map((a) => a.getAttribute('href')!)
    .filter((h) => h.startsWith(`/${collection}/`))
    .map((h) => { const rest = h.slice(collection.length + 2); expect(rest, h).not.toMatch(/[/#?\s]/); return decodeURIComponent(rest.split(/[?#]/)[0]); });
}
const draw = (el: ReactElement) => render(<Tooltip.Provider>{el}</Tooltip.Provider>).container;

describe('a link to a record names that record, whatever its id holds', () => {
  it('the address helpers', () => {
    for (const id of IDS) {
      expect(decodeURIComponent(customerAddress(id).slice('/customers/'.length))).toBe(id);
      expect(decodeURIComponent(requestAddress(id).slice('/requests/'.length))).toBe(id);
      expect(customerAddress(id).slice('/customers/'.length)).not.toMatch(/[/#?\s]/);
    }
  });

  it('Customers, each row', async () => {
    const base = ((await readAll('customers')).rows as CustomerRecord[]).slice(0, IDS.length).map(customerRow);
    const rows = base.map((r, i) => ({ ...r, id: IDS[i] }));
    expect(named(draw(<CustomersView rows={rows} />), 'customers').sort()).toEqual([...IDS].sort());
  });

  it('Requests, each row, and the customer it names', async () => {
    const { rows, summary, state } = await readRequests({}, { customers: true });
    const odd = rows.slice(0, IDS.length).map((r, i) => ({ ...r, id: IDS[i], customerId: IDS[i] }));
    const page = draw(<RequestsView rows={odd} total={odd.length} summary={summary} state={state} pageSize={REQUEST_PAGE} updatedAt={DEMO_UPDATED_AT.toISOString()} now={DEMO_UPDATED_AT.toISOString()} />);
    expect(new Set(named(page, 'requests'))).toEqual(new Set(IDS));
  });

  it('a request, and the request it replays', async () => {
    const r = { ...((await read('requests', { limit: 1 })).rows[0] as RequestRow), id: 'r#2', replayOf: 'acme/eu' };
    const page = draw(<RequestView request={r} trace={traceOf(r)} payloads={payloadsOf(r)} routeP95={null} now={DEMO_UPDATED_AT.toISOString()} replay={none} customerHref={customerAddress('two words')} />);
    expect(named(page, 'requests')).toEqual(['acme/eu']);
    expect(new Set(named(page, 'customers'))).toEqual(new Set(['two words']));
  });

  it('the addresses a page hands an agent', async () => {
    const r = { ...((await read('requests', { limit: 1 })).rows[0] as RequestRow), id: 'r#2', replayOf: 'acme/eu' };
    const told = JSON.stringify(requestContext({ request: r, trace: traceOf(r), routeP95: null, statusText: 'OK', payloadChars: { request: null, response: 0 }, now: DEMO_UPDATED_AT.toISOString() }));
    expect(told).toContain('/requests/r%232');
    expect(told).toContain('/requests/acme%2Feu');
    const data = (await customerTool.read({ id: 'northwind-labs' })).data;
    expect(JSON.stringify(customerContext({ ...data, customer: { ...data.customer, id: 'acme/eu' } }))).toContain('/customers/acme%2Feu');
  });
});
