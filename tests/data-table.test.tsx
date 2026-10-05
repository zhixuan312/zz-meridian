import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable, type Column } from '@/components/patterns/data-table';

type Row = { id: string; name: string; status: string; calls: number };
const rows: Row[] = [
  { id: 'a', name: 'Northwind Labs', status: 'Active', calls: 643_000 },
  { id: 'b', name: 'Halcyon Health', status: 'Invited', calls: 375_000 },
];
const columns: Column<Row>[] = [
  { key: 'name', header: 'Customer', grow: true, mobile: 'title', cell: (r) => r.name },
  { key: 'status', header: 'Status', mobile: 'status', cell: (r) => r.status },
  { key: 'calls', header: 'Requests', numeric: true, mobile: 'fact', cell: (r) => r.calls.toLocaleString('en-US'), mobileCell: (r) => `${r.calls} requests` },
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
});
