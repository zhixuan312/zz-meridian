// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// The address is not known until the request: reading it suspends, as it does on a cold load.
vi.mock('next/navigation', () => ({
  usePathname: () => '/customers',
  useSearchParams: () => { throw new Promise(() => {}); },
  useRouter: () => ({ replace() {}, push() {}, refresh() {} }),
}));

import CustomersPage from '../app/(dashboard)/customers/page';

describe('the customers page, on a cold load', () => {
  it('has its masthead in the first HTML, outside the boundary that reads the address', () => {
    const html = renderToString(<CustomersPage />);
    expect(html).toMatch(/<h1[^>]*>[^<]*Customers/);
    expect(html).toContain('Who is calling the API');
  });
});
