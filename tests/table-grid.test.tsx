import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { DataTable, type Column } from '@/components/patterns/data-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const cols = (table: HTMLElement) => ['--cols', '--cols-xl', '--cols-lg', '--cols-md', '--cols-sm'].map((v) => table.style.getPropertyValue(v));

/** The table is a grid of one auto track per column it draws at each width; the spare sits between them. */
describe('the table counts its columns from its head', () => {
  it('drops a column from the count below its hideBelow step and every narrower one', () => {
    const { container } = render(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader grow>Request</TableHeader>
            <TableHeader hideBelow="xl">Region</TableHeader>
            <TableHeader hideBelow="md">Customer</TableHeader>
            <TableHeader align="right">Latency</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody><TableRow><TableCell>a</TableCell><TableCell>b</TableCell><TableCell>c</TableCell><TableCell>d</TableCell></TableRow></TableBody>
      </Table>,
    );
    const table = container.querySelector('table')!;
    expect(cols(table)).toEqual(['repeat(4, auto)', 'repeat(3, auto)', 'repeat(3, auto)', 'repeat(2, auto)', 'repeat(2, auto)']);
    expect(table.getAttribute('class')).toContain('justify-between');
    expect(container.querySelector('tbody tr')!.getAttribute('role')).toBe('row');
  });

  it('counts a headless table from its first row', () => {
    const { container } = render(<Table><TableBody><TableRow><TableCell>a</TableCell><TableCell hideBelow="sm">b</TableCell></TableRow></TableBody></Table>);
    expect(cols(container.querySelector('table')!)).toEqual(['repeat(2, auto)', 'repeat(2, auto)', 'repeat(2, auto)', 'repeat(2, auto)', 'repeat(1, auto)']);
  });

  // A server component's JSX reaches the client Table as references to the client module, not as the functions it
  // exported; only the props survive. A wrapper of another type reproduces that here: the Table cannot match a cell by
  // identity, so it reads the shape, and a table that counted columns by identity laid every one out as a single
  // column (#85).
  it('counts a table a server component wrote, where no child is the component the client module exports', () => {
    const Head = ({ children }: { children?: ReactNode }) => <TableHead>{children}</TableHead>;
    const Body = ({ children }: { children?: ReactNode }) => <TableBody>{children}</TableBody>;
    const Row = ({ children }: { children?: ReactNode }) => <TableRow>{children}</TableRow>;
    const Th = ({ children, hideBelow, grow, align }: { children?: ReactNode; hideBelow?: 'xl' | 'md'; grow?: boolean; align?: 'left' | 'right' }) => (
      <TableHeader hideBelow={hideBelow} grow={grow} align={align}>{children}</TableHeader>
    );
    const Td = ({ children }: { children?: ReactNode }) => <TableCell>{children}</TableCell>;
    const { container } = render(
      <Table>
        <>
          <Head>
            <Row>
              <Th grow>Request</Th>
              <Th hideBelow="xl">Region</Th>
              <Th hideBelow="md">Customer</Th>
              <Th align="right">Latency</Th>
            </Row>
          </Head>
        </>
        <Body><Row><Td>a</Td><Td>b</Td><Td>c</Td><Td>d</Td></Row></Body>
      </Table>,
    );
    expect(cols(container.querySelector('table')!)).toEqual(['repeat(4, auto)', 'repeat(3, auto)', 'repeat(3, auto)', 'repeat(2, auto)', 'repeat(2, auto)']);
  });

  it("does not count DataTable's selection column, which sits over the lead's padding", () => {
    type Row = { id: string; name: string };
    const columns: Column<Row>[] = [
      { key: 'name', header: 'Name', grow: true, mobile: 'title', cell: (r) => r.name },
      { key: 'id', header: 'ID', cell: (r) => r.id },
    ];
    const { container } = render(<DataTable caption="Things" noun="things" rows={[{ id: 't1', name: 'One' }]} columns={columns} rowKey={(r) => r.id} selectable selected={new Set()} onSelectedChange={() => {}} />);
    const table = container.querySelector('table')!;
    expect(cols(table)[0]).toBe('repeat(2, auto)');
    expect(container.querySelector('thead th')!.hasAttribute('data-check')).toBe(true);
    expect(container.querySelector('tbody td')!.hasAttribute('data-check')).toBe(true);
  });
});
