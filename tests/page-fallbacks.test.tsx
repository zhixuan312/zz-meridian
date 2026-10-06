// @vitest-environment node
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => { throw new Promise(() => {}); },
  useRouter: () => ({ replace() {}, push() {}, refresh() {} }),
}));

import AnalyticsPage from '../app/(dashboard)/analytics/page';
import CustomersPage from '../app/(dashboard)/customers/page';
import OverviewPage from '../app/(dashboard)/(overview)/page';
import RequestsPage from '../app/(dashboard)/requests/page';

/** The first HTML a cold load sends: the shell, with every pending boundary as its fallback. */
const shell = (el: ReactElement) =>
  new Promise<string>((resolve, reject) => {
    const out = new PassThrough();
    let html = '';
    out.on('data', (c) => { html += c; });
    const stream = renderToPipeableStream(el, { onShellReady: () => { stream.pipe(out); setTimeout(() => { stream.abort(); resolve(html); }, 50); }, onShellError: reject, onError: () => {} });
  });

const never = new Promise<never>(() => {});

describe('the page-level fallbacks a console route streams', () => {
  it.each([
    ['overview', <OverviewPage key="o" searchParams={never} />],
    ['analytics', <AnalyticsPage key="a" searchParams={never} />],
    ['requests', <RequestsPage key="r" searchParams={never} />],
    ['customers', <CustomersPage key="c" />],
  ] as const)('%s announces itself as busy once, and carries one masthead', async (name, el) => {
    const html = await shell(el);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(`aria-label="Loading ${name}"`);
    expect(html.match(/<h1\b/g)?.length).toBe(1);
  });
});
