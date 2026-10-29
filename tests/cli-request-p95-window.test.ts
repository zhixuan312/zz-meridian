// Named cli-* so the payload leaves it out: it reads the sample's own requests.
import { describe, expect, it } from 'vitest';
import { traceOf } from '@/data/sample';
import { DEMO_NOW, REQUESTS } from '@/system/fixtures/sample';
import { requestContext } from '@/logic/request-context';

/**
 * One request's context compares its latency with its route's p95 and says over which days that p95 is, the last 30
 * complete days the endpoints collection holds, so "118 ms against 96 ms" is not read as the spread of a sample.
 */
describe("a request's context", () => {
  it("states its route's p95 with its window", () => {
    const r = REQUESTS[0];
    const { insights } = requestContext({ request: r, trace: traceOf(r), routeP95: 96, statusText: 'OK', payloadChars: { request: null, response: 0 }, now: DEMO_NOW.toISOString() });
    const line = insights.find((i) => i.text.includes('p95'))?.text ?? '';
    expect(line).toContain(`the p95 of ${r.method} ${r.route} over the last 30 complete days (96ms)`);
  });
});
