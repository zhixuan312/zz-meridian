import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// jsdom runs no container query, so this holds the half the browser cannot: each dropped cell says when it is dropped,
// which the Table's padding rule reads to find the column drawn last (#70). The padding itself was measured in a browser.
describe('a table whose last column drops below a width (#70)', () => {
  it('marks the dropped column\'s head and cells with the width they drop below', () => {
    const { container } = render(
      <Table>
        <TableHead><TableRow><TableHeader>Name</TableHeader><TableHeader hideBelow="lg">Started</TableHeader></TableRow></TableHead>
        <TableBody><TableRow><TableCell>Login</TableCell><TableCell hideBelow="lg">4 h ago</TableCell></TableRow></TableBody>
      </Table>,
    );
    expect([...container.querySelectorAll('[data-hide-below]')].map((c) => c.getAttribute('data-hide-below'))).toEqual(['lg', 'lg']);
    expect(container.querySelector('table')!.className).toContain('@max-[896px]:[&_tr>:nth-last-child(1_of_:not([data-hide-below=xl]):not([data-hide-below=lg]))]:pr-(--card-pad)');
  });
});
