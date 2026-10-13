import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
/** The page's client view, replaced by one that keeps what it was handed: the props are what the browser is sent. */
const handed = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
vi.mock('@/views/customers', () => ({ CustomersView: ({ rows }: { rows: Record<string, unknown>[] }) => { handed.rows = rows; return null; } }));

import CustomersPage from '../app/(dashboard)/customers/page';
import { collections } from '@/data/collections';

/**
 * The Customers page reads every customer and hands its client a list. A customer's record holds more than a row draws
 * (its requests by route, its tokens, its owner, the dates of its life with us), and a browser is sent what it is
 * handed: so the list is handed the fields of a row, and the rest stays on the server for the customer's own page.
 */
describe('what the Customers page hands its client', () => {
  it('is every customer, each with the fields a row draws and nothing else of its record', async () => {
    const page = await CustomersPage();
    // The page's body is an async component behind a boundary: render it by calling it, as the server does.
    const Customers = (page.props.children as { props: { children: { type: () => Promise<React.ReactElement> } } }).props.children.type;
    render(await Customers());
    const every = (await collections.find((c) => c.name === 'customers')!.query({})).rows;
    expect(handed.rows).toHaveLength(every.length);
    for (const row of handed.rows) expect(Object.keys(row).sort(), String(row.name)).toEqual(['errorRate', 'id', 'joined', 'name', 'plan', 'requests', 'revenue', 'status', 'trend']);
    expect(JSON.stringify(handed.rows)).not.toMatch(/byEndpoint|\/v1\/|tokens|owner|pastDueSince/);
    expect(Object.keys(every[0])).toContain('byEndpoint');
  });
});
