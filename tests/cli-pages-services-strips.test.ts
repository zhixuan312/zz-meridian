// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own Services page, which a product replaces.
import { describe, expect, it } from 'vitest';
import type { Service, ServiceStatus } from '@/components/patterns/status-list';
import { operationalShare, servicesContext, servicesHead, stripDates } from '@/logic/services-context';

/** A service whose strip is `days` long, operational on every day but those in `marked`, counted back from today (0 is today). */
const service = (name: string, days: number, marked: Record<number, ServiceStatus> = {}): Service => ({
  name, description: '', status: marked[0] ?? 'operational', uptime: 1, latency: 100,
  days: Array.from({ length: days }, (_, i) => marked[days - 1 - i] ?? 'operational'),
});

const NOW = '2026-10-15T09:00:00.000Z';

describe('services that keep strips of different lengths', () => {
  it('line up on today, and a day a service does not keep counts it neither up nor down', () => {
    const share = operationalShare([service('Inference API', 90), service('Billing', 30)]);
    expect(share).toHaveLength(90);
    expect(share.every((s) => s === 1)).toBe(true);
  });

  it('count a mark on the day it was made, whichever service comes first', () => {
    // Billing is down yesterday: the second-to-last day of the axis, not the second-to-last of Billing's first 30.
    const share = operationalShare([service('Billing', 30, { 1: 'outage' }), service('Inference API', 90)]);
    expect(share).toHaveLength(90);
    expect(share.at(-2)).toBe(0.5);
    expect(share.filter((s) => s !== 1)).toHaveLength(1);
  });

  it('state the longest strip as the days the title and the context count', () => {
    const services = [service('Billing', 30, { 1: 'degraded' }), service('Inference API', 90)];
    const head = servicesHead({ services, history: null });
    expect(head.title).toMatch(/ in 90 days/);
    const context = servicesContext({ services, incidents: { open: [], resolved: [] }, head, updatedAt: NOW, now: NOW });
    expect(context.facts.find((f) => f.label.startsWith('Uptime, all services'))?.label).toBe('Uptime, all services, 90 days');
    expect(context.insights.map((i) => i.text).join('\n')).toMatch(/^1 of the last 90 days had a service below operational; Billing accounts for 1 of them\.$/m);
  });
});

describe("the strip's days", () => {
  it("end on today in the product's time zone, not in UTC", () => {
    // 23:30 UTC on 15 October is already 16 October in Shanghai: the strip's last day is the day in progress there.
    const end = new Date('2026-10-15T23:30:00.000Z');
    expect(stripDates(3, end, 'Asia/Shanghai')).toEqual(['2026-10-14', '2026-10-15', '2026-10-16']);
    expect(stripDates(3, end, 'UTC')).toEqual(['2026-10-13', '2026-10-14', '2026-10-15']);
  });
});
