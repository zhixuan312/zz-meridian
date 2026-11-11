import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable } from '@/components/patterns/data-table';

type Row = { id: string; name: string };
const rows: Row[] = Array.from({ length: 25 }, (_, i) => ({ id: `r${i}`, name: `Row ${i}` }));
const columns = [{ key: 'name', header: 'Name', cell: (r: Row) => r.name }];

describe('a server-paged table', () => {
  it('offers no rows-per-page menu: the server pages, and would never hear of the choice', () => {
    render(<DataTable title="Requests" caption="Requests" rows={rows} columns={columns as never} rowKey={(r: Row) => r.id} manual total={400} pageSize={25} noun="requests" />);
    expect(screen.queryByRole('button', { name: /per page/i })).toBeNull();
    expect(screen.getByText(/1–25|1-25/)).toBeTruthy();
  });

  it('a client-paged table still offers it', () => {
    render(<DataTable title="Requests" caption="Requests" rows={rows} columns={columns as never} rowKey={(r: Row) => r.id} pageSize={20} noun="requests" />);
    expect(screen.getByRole('button', { name: /per page/i })).toBeTruthy();
  });

  it('keeps the size menu when the chosen size fits every row, and shows no one-page navigation', () => {
    // 30 rows at 50 a page: the size control must stay, or the person cannot return to 20; the page arrows do not.
    render(<DataTable title="Requests" caption="Requests" rows={rows.slice(0, 30)} columns={columns as never} rowKey={(r: Row) => r.id} pageSize={50} noun="requests" />);
    expect(screen.getByRole('button', { name: /per page/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
    expect(screen.queryByText(/Page 1 of 1/)).toBeNull();
  });
});
