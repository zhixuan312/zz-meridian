import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

const wrapOf = (td: Element) => td.firstElementChild!.getAttribute('class')?.split(/\s+/) ?? [];

/** The cut track is as wide as the value, so the cell's text-align cannot move it: the wrapper carries the alignment. */
describe('a cut cell keeps its alignment', () => {
  it('justifies a right-aligned, numeric or centred value and leaves a left one alone', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell truncate>left</TableCell>
            <TableCell truncate align="right">right</TableCell>
            <TableCell truncate numeric>1,204</TableCell>
            <TableCell truncate align="center">centre</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const [left, right, numeric, centre] = [...container.querySelectorAll('td')].map(wrapOf);
    expect(left).not.toContain('justify-end');
    expect(left).not.toContain('justify-center');
    expect(right).toContain('justify-end');
    expect(numeric).toContain('justify-end');
    expect(centre).toContain('justify-center');
  });
});
