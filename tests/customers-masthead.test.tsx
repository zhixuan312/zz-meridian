// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// The address is not known until the request: reading it suspends, as it does on a cold load.
vi.mock('next/navigation', () => ({
  usePathname: () => '/customers',
  useSearchParams: () => { throw new Promise(() => {}); },
  useRouter: () => ({ replace() {}, push() {}, refresh() {} }),
}));

import CustomersPage from '../app/(dashboard)/customers/page';

// The page asks its feature before it renders (src/data/access.ts's `gate`), so it is asynchronous: the renderer awaits
// it and renders what it returned. What that returns is the cold load's page — the masthead, with the boundary that
// waits on the address left as its fallback. The masthead is therefore outside that boundary, which is what this proves;
// the page's gate now sits in front of the masthead, so the shell a production build streams starts with the frame and
// `tests/page-fallbacks.test.tsx` is what covers the fallbacks and the single masthead it carries.
describe('the customers page, on a cold load', () => {
  it('has its masthead outside the boundary that reads the address', async () => {
    const html = renderToStaticMarkup(await CustomersPage());
    expect(html).toMatch(/<h1[^>]*>[^<]*Customers/);
    expect(html).toContain('Who is calling the API');
  });
});
