import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

describe('the table accessibility roles', () => {
  it('keeps its row role with responsive columns', () => {
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
    expect(container.querySelector('tbody tr')!.getAttribute('role')).toBe('row');
  });

});
