import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Pagination } from '@/components/ui/pagination';

/** A page-size menu is a choice, so a list of one size draws none (#109). */
describe('Pagination page sizes', () => {
  const pager = (pageSizes: number[]) => render(<Pagination page={1} pageSize={10} total={25} onPageChange={() => {}} pageSizes={pageSizes} onPageSizeChange={() => {}} />);

  it('draws no menu for a single size', () => {
    expect(pager([10]).container.textContent).not.toContain('per page');
  });

  it('draws the menu when there is a choice', () => {
    expect(pager([10, 20]).container.textContent).toContain('10 per page');
  });
});
