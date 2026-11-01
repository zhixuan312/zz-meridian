// @vitest-environment node
// Sample-specific: adopted products replace this view, so it is not carried in the payload.
import { describe, expect, it } from 'vitest';
import { nowData, type NowReads } from '@/logic/now-parts';
import { MODELS } from '@/system/fixtures/sample';
import { USAGE } from '@/system/fixtures/company';

const base: NowReads = { services: [], incidents: [], releases: [], runs: [], history: [], usage: [], models: [MODELS[0]], compute: [], endpoints: [], tickets: [], activity: [], reader: 'probe', updatedAt: '2026-10-03T04:00:00Z', now: '2026-10-03T04:00:00Z' };
const row = (date: string, requests: number) => ({ ...USAGE[0], date, model: MODELS[0].id, requests, errors: 0, p95: requests, ttft: requests });

describe('Now model figures over the last 30 complete calendar days', () => {
  it('uses calendar boundaries even when recorded usage dates have gaps', () => {
    const data = nowData({ ...base, usage: [row('2026-08-01', 1000), row('2026-09-02', 1000), row('2026-09-03', 10), row('2026-10-02', 20), row('2026-10-03', 1000), row('2026-10-04', 1000)] });
    expect(data.models![0]).toMatchObject({ requests: 30, p95: 10, ttft: 10 });
  });

  it('does not promote old measurements into the current month after traffic stops', () => {
    const data = nowData({ ...base, usage: [row('2026-08-01', 1000)] });
    expect(data.models![0]).toMatchObject({ requests: 0, p95: null, ttft: null, errorRate: null });
  });
});
