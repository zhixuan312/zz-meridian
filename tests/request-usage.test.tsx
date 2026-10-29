import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/requests/x', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import { RequestView } from '@/views/request';
import { requestContext } from '@/logic/request-context';
import { REQUESTS } from '@/system/fixtures/sample';
import { payloadsOf, traceOf, type RequestRow } from '@/data/sample';

const show = (r: RequestRow, trace = traceOf(r)) =>
  render(<RequestView routeP95={612} request={r} trace={trace} payloads={payloadsOf(r)} now="2026-10-05T09:00:00.000Z" replay={async () => ({ ok: false, error: '' })} />);
const fact = (r: RequestRow, label: string) => requestContext({ request: r, trace: traceOf(r), routeP95: 612, statusText: '', payloadChars: { request: null, response: 0 }, now: '2026-10-05T09:00:00.000Z' }).facts.find((f) => f.label === label)?.value;

describe("a request's tokens and cost say why there are none", () => {
  test('a request that failed (5xx) is not called refused', () => {
    const failed = REQUESTS.find((r) => r.status >= 500 && r.model)!;
    show(failed);
    expect(screen.queryByText('None, refused')).toBeNull();
    expect(screen.getAllByText('None, it failed')).toHaveLength(2);
    expect(fact(failed, 'Cost')).toBe('None, it failed');
  });

  test('a request that was refused (4xx) is', () => {
    const refused = REQUESTS.find((r) => r.status >= 400 && r.status < 500 && r.model)!;
    show(refused);
    expect(screen.getAllByText('None, refused')).toHaveLength(2);
    expect(fact(refused, 'Cost')).toBe('None, refused');
  });
});

describe('the trace of a request that took no time', () => {
  test('draws its phases at the start, never at NaN%', () => {
    const r = { ...REQUESTS.find((x) => x.status < 400)!, latency: 0 };
    const { container } = show(r, traceOf(r).map((s) => ({ ...s, start: 0, duration: 0 })));
    const bars = [...container.querySelectorAll<HTMLElement>('figure[aria-label="Request phases"] span[style]')];
    expect(bars.length).toBeGreaterThan(0);
    // A browser drops a NaN length, so the bar loses its place and its width: both must be there, at the start.
    for (const b of bars) expect([b.style.left, b.style.width]).toEqual(['0%', 'max(4px, 0%)']);
  });
});
