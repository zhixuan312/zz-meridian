// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own Home and Now, which a product replaces.
import { describe, expect, it } from 'vitest';
import type { DailyPoint } from '@/data/sample';
import { yearOf } from '@/views/home-parts';
import { nowData } from '@/views/now-parts';

const DAY = 86_400_000;
/** 120 complete days ending 14 Oct 2026: none with a request for the first 40, then 1,000 a day growing by 10, each at p95 300 ms. */
const history: DailyPoint[] = Array.from({ length: 120 }, (_, i) => {
  const requests = i < 40 ? 0 : 1_000 + (i - 40) * 10;
  return {
    date: new Date(Date.parse('2026-06-17T00:00:00Z') + i * DAY).toISOString().slice(0, 10),
    requests, errors: 0, p95: requests ? 300 : 0, tokens: requests * 100, revenue: requests / 100, revenueByPlan: { Starter: 0, Scale: 0, Enterprise: 0 },
  };
});

describe("the year's sentence, when the days kept begin before the first request", () => {
  it('grows from the first window with a request every day, names where it starts, and states the p95 from there', () => {
    const { title, windows } = yearOf(history, '30d');
    expect(windows).toHaveLength(4);
    expect(windows[0].requests).toBe(0);
    // The second window holds the first request, after 10 days with none: it is not where the sentence starts.
    expect(windows[1].requests).toBeGreaterThan(0);
    expect(title).not.toMatch(/—|Infinity|NaN/);
    expect(title).toMatch(/^Requests grew [\d.]+% from the 30 days to 14 Sept 2026, and p95 stayed between 300 and 300 ms$/);
  });

  it('never reads flat traffic as growth, nor a p95 of 0, when the first request falls inside a window', () => {
    // 50 days with none, then a flat 1,000 a day: the window holding the first request has 20 days with none of 30.
    const flat = history.map((d, i) => (i < 50 ? { ...d, requests: 0, p95: 0, tokens: 0, revenue: 0 } : { ...d, requests: 1_000, tokens: 100_000, revenue: 10 }));
    expect(yearOf(flat, '30d').title).toBe('Requests held level from the 30 days to 14 Sept 2026, and p95 stayed between 300 and 300 ms');
  });

  it('is the line Now states among the facts of the band', () => {
    const now = '2026-10-15T09:00:00.000Z';
    const data = nowData({
      services: [], incidents: [], releases: [], runs: [], history, usage: [], models: [], compute: [], endpoints: [], tickets: [], activity: [],
      reader: 'members_1', updatedAt: now, now,
    });
    const year = data.band?.facts.find((f) => f.about === 'year');
    expect(year?.text).toBe(yearOf(history, '30d').title);
  });

  it('is not stated with fewer than two windows with a request every day', () => {
    const late = history.map((d, i) => (i < 95 ? { ...d, requests: 0, p95: 0 } : d));
    expect(yearOf(late, '30d').title).toBe('Requests and latency, a period at a time');
    const now = '2026-10-15T09:00:00.000Z';
    const data = nowData({
      services: [], incidents: [], releases: [], runs: [], history: late, usage: [], models: [], compute: [], endpoints: [], tickets: [], activity: [],
      reader: 'members_1', updatedAt: now, now,
    });
    expect(data.band?.facts.map((f) => f.about)).not.toContain('year');
  });
});
