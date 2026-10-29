import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable, sortRows, type Column } from '@/components/patterns/data-table';

type Row = { id: string; name: string; status: string; calls: number };
const rows: Row[] = [
  { id: 'a', name: 'Northwind Labs', status: 'Active', calls: 643_000 },
  { id: 'b', name: 'Halcyon Health', status: 'Invited', calls: 375_000 },
];
const columns: Column<Row>[] = [
  { key: 'name', header: 'Customer', grow: true, mobile: 'title', sortValue: (r) => r.name, cell: (r) => r.name },
  { key: 'status', header: 'Status', mobile: 'status', sortValue: (r) => r.status, cell: (r) => r.status },
  { key: 'calls', header: 'Requests', numeric: true, mobile: 'fact', sortValue: (r) => r.calls, cell: (r) => r.calls.toLocaleString('en-US'), mobileCell: (r) => `${r.calls} requests` },
  { key: 'id', header: 'ID', cell: (r) => r.id },
];

/** The table under test: two records, one card per role plus a column a phone never shows. */
const table = () => render(<DataTable caption="Customers" noun="customers" rows={rows} columns={columns} rowKey={(r) => r.id} />);

describe('DataTable', () => {
  it('draws one tree: a record is in the page once, as a table row', () => {
    const { container } = table();
    // One row per record, and no second list. The component used to draw a row AND a card in a `<ul>` the CSS hid, so
    // every record was in the DOM twice and every cell function ran twice on every render.
    expect(container.querySelectorAll('tbody tr')).toHaveLength(rows.length);
    expect(screen.getAllByText('Northwind Labs')).toHaveLength(1);
  });

  it('keeps one table — a head and a body, with no second list to hide', () => {
    const { container } = table();
    expect(container.querySelectorAll('table')).toHaveLength(1);
    expect(container.querySelectorAll('thead')).toHaveLength(1);
    expect(container.querySelectorAll('ul, ol')).toHaveLength(0);
  });

  it('says on each cell which part of a phone card it is, so the CSS can lay the row out', () => {
    const { container } = table();
    const roles = [...container.querySelectorAll('tbody tr:first-child td')].map((td) => td.getAttribute('data-mobile'));
    // The title and its status on the card's first line, the fact under them; the ID names no role, so a phone drops it.
    expect(roles).toEqual(['title', 'status', 'fact', 'hidden']);
  });

  it('renders the phone wording beside the desktop one, never in a second copy of the row', () => {
    table();
    expect(screen.getByText('643,000')).toBeInTheDocument();
    expect(screen.getByText('643000 requests')).toBeInTheDocument();
  });
  it('sorts by a column, and puts the rows that have no value for it last whichever way it is sorted', () => {
    type R = { id: string; last: string | null };
    const rs: R[] = [{ id: 'a', last: '2026-01-01' }, { id: 'b', last: null }, { id: 'c', last: '2026-03-01' }];
    const cols: Column<R>[] = [{ key: 'last', header: 'Last active', sortValue: (r) => r.last, cell: (r) => r.last ?? 'Never' }];
    // A member who has never signed in is not the earliest date: the two comparisons are not each other's inverse
    // when a value is absent, so before this the order depended on the array's length and shape.
    expect(sortRows(rs, cols, 'last', 'desc').map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(sortRows(rs, cols, 'last', 'asc').map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts text in the order a reader expects, whatever its case and accents, and numbers by value', () => {
    type R = { id: string; name: string; n: number };
    const rs: R[] = [{ id: 'z', name: 'Zoë', n: 10 }, { id: 'a', name: 'acme', n: 9 }, { id: 'e', name: 'Émile', n: 100 }];
    const cols: Column<R>[] = [{ key: 'name', header: 'Name', sortValue: (r) => r.name, cell: (r) => r.name }, { key: 'n', header: 'N', sortValue: (r) => r.n, cell: (r) => r.n }];
    expect(sortRows(rs, cols, 'name', 'asc').map((r) => r.id)).toEqual(['a', 'e', 'z']);
    expect(sortRows(rs, cols, 'n', 'asc').map((r) => r.id)).toEqual(['a', 'z', 'e']);
  });

  it('states the order it keeps its own state in, so the head carries the caret for the order the rows are in', () => {
    render(<DataTable caption="Members" noun="members" rows={rows} columns={columns} rowKey={(r) => r.id} defaultState={{ sort: 'calls', dir: 'desc' }} />);
    // The calls column, pressed down by default: 643,000 over 375,000, and its head says so.
    expect(screen.getAllByRole('columnheader', { name: /Requests/ })[0].getAttribute('aria-sort')).toBe('descending');
    expect([...document.querySelectorAll('tbody tr')].map((tr) => tr.textContent)).toEqual([
      expect.stringContaining('Northwind Labs'),
      expect.stringContaining('Halcyon Health'),
    ]);
  });

  it('makes the title of a row that opens a record its link; the row is the hover target and the title has no hover style of its own', () => {
    render(<DataTable caption="Customers" noun="customers" rows={rows} columns={columns} rowKey={(r) => r.id} rowHref={(r) => `/customers/${r.id}`} />);
    const link = screen.getAllByRole('link', { name: 'Northwind Labs' })[0];
    expect(link.getAttribute('href')).toBe('/customers/a');
    expect(link.className).not.toMatch(/row-link|link|underline/);
  });
});

describe('the error state', () => {
  it('draws Retry busy while the person\'s retry is on its way (#59)', () => {
    const onRetry = vi.fn();
    const view = render(<DataTable caption="Customers" noun="customers" rows={[]} columns={columns} rowKey={(r) => r.id} error="The API did not answer." onRetry={onRetry} />);
    const retry = () => screen.getByRole('button', { name: 'Retry' });
    expect(retry()).not.toHaveAttribute('aria-busy');
    view.rerender(<DataTable caption="Customers" noun="customers" rows={[]} columns={columns} rowKey={(r) => r.id} error="The API did not answer." onRetry={onRetry} retrying />);
    expect(retry()).toHaveAttribute('aria-busy', 'true');
  });
});
