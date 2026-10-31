import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable, type Column } from '@/components/patterns/data-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function expectContent(td: Element, text: string) {
  expect(td.textContent).toContain(text);
  return td;
}

describe('a cut cell preserves its full value', () => {
  it('keeps a truncating value in its title', () => {
    const { container } = render(
      <Table>
        <TableHead><TableRow><TableHeader grow>Request</TableHeader><TableHeader>Status</TableHeader></TableRow></TableHead>
        <TableBody><TableRow><TableCell truncate>/v1/messages/with/a/long/tail</TableCell><TableCell>200</TableCell></TableRow></TableBody>
      </Table>,
    );
    const td = container.querySelector('td')!;
    expect(td.getAttribute('title')).toBe('/v1/messages/with/a/long/tail');
  });
});

type Row = { id: string; name: string; plan: string; region: string };
const rows: Row[] = [{ id: 'cus_8f2a', name: 'Northwind Labs International Holdings', plan: 'Enterprise', region: 'eu-west-1' }];

describe('DataTable cut columns', () => {
  it('keeps the titles and contents of cut columns', () => {
    const columns: Column<Row>[] = [
      { key: 'name', header: 'Customer', grow: true, truncate: true, mobile: 'title', title: (r) => r.name, cell: (r) => <span className="flex min-w-0 items-center gap-3"><span className="truncate font-medium">{r.name}</span></span> },
      { key: 'id', header: 'ID', width: 'w-28', cell: (r) => r.id },
      { key: 'plan', header: 'Plan', truncate: true, mobile: 'fact', cell: (r) => r.plan },
    ];
    const { container } = render(<DataTable caption="Customers" noun="customers" rows={rows} columns={columns} rowKey={(r) => r.id} selectable selected={new Set()} onSelectedChange={() => {}} />);
    const cells = [...container.querySelectorAll('tbody tr:first-child td')];
    const byText = (t: string) => cells.find((td) => td.textContent?.includes(t))!;
    expectContent(byText('Northwind'), 'Northwind Labs International Holdings');
    expect(byText('Northwind').getAttribute('title')).toBe('Northwind Labs International Holdings');
    expectContent(byText('Enterprise'), 'Enterprise');
  });

  it('keeps the row link and the phone content', () => {
    const columns: Column<Row>[] = [
      { key: 'name', header: 'Customer', grow: true, truncate: true, mobile: 'title', title: (r) => r.name, cell: (r) => r.name },
      { key: 'plan', header: 'Plan', truncate: true, mobile: 'fact', cell: (r) => r.plan, mobileCell: (r) => `${r.plan} plan` },
      { key: 'region', header: 'Region', truncate: true, mobile: 'fact', cell: (r) => r.region },
    ];
    const { container } = render(<DataTable caption="Customers" noun="customers" rows={rows} columns={columns} rowKey={(r) => r.id} rowHref={(r) => `/customers/${r.id}`} />);
    const [title, plan, region] = [...container.querySelectorAll('tbody tr:first-child td')];
    const titleWrap = expectContent(title, 'Northwind Labs International Holdings');
    expect(titleWrap.querySelector('a[href="/customers/cus_8f2a"]')).toBeTruthy();
    expectContent(plan, 'Enterprise plan');
    expectContent(region, 'eu-west-1');
  });
});
