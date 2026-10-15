// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own Now page, which a product replaces.
import { describe, expect, it } from 'vitest';
import { workspaces } from '@/app.config';
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import type { DailyPoint } from '@/data/sample';
import { nowData, type NowReads } from '@/views/now-parts';

/** The characters the lead's room holds (`LeadRoom` in `src/components/patterns/page-loading`): the line, ". " and who Engineering is for. */
const ROOM = 220;
const NOW = '2026-10-15T09:00:00.000Z';
const DAY = 86_400_000;
const MIN = 60_000;

const history: DailyPoint[] = Array.from({ length: 360 }, (_, i) => ({
  date: new Date(Date.parse('2026-10-15T00:00:00Z') - (360 - i) * DAY).toISOString().slice(0, 10),
  requests: 1_000, errors: 0, p95: 300, tokens: 100_000, revenue: 10, revenueByPlan: { Starter: 0, Scale: 0, Enterprise: 0 },
}));
const services: Service[] = [
  { name: 'Inference API', description: '', status: 'degraded', uptime: 0.99, latency: 400, days: Array(90).fill('operational') },
  { name: 'Billing', description: '', status: 'operational', uptime: 1, latency: 100, days: Array(90).fill('operational') },
];
/** An open incident that started `ago` minutes before now, with an update at each of `after` minutes from its start. */
const incident = (id: string, severity: Incident['severity'], ago: number, after: number[]): Incident => {
  const started = new Date(Date.parse(NOW) - ago * MIN).toISOString();
  return { id, title: `Incident ${id}`, service: 'Inference API', severity, state: 'investigating', started, updates: after.map((m) => ({ at: new Date(Date.parse(started) + m * MIN).toISOString(), text: 'An update.' })) };
};
const line = (incidents: Incident[]) => nowData({
  services, incidents, releases: [], runs: [], history, usage: [], models: [], compute: [], endpoints: [], tickets: [], activity: [],
  reader: 'members_1', updatedAt: NOW, now: NOW,
} satisfies NowReads).line!;
/** The sentence the page draws under its title, as `app/(dashboard)/engineering/page.tsx` writes it. */
const lead = (l: string) => `${l}. ${workspaces.engineering.audience}`;

const EIGHT = [0, 12, 25, 66, 96, 126, 156, 204];

describe("the line under Now's title, held to its lead's room", () => {
  it('states every update when they fit, as the sample does', () => {
    const l = line([incident('a', 'major', 240, [0, 66, 156])]);
    expect(l).toBe('Updates at the start, after 1.1h and after 2.6h; 1 service degraded; 360 of 360 days inside the band');
    expect(lead(l).length).toBeLessThanOrEqual(ROOM);
  });

  it('counts the updates, and names the latest, when every one would not fit', () => {
    const l = line([incident('a', 'major', 240, EIGHT)]);
    expect(l).toBe('8 updates, the latest after 3.4h; 1 service degraded; 360 of 360 days inside the band');
    expect(lead(l).length).toBeLessThanOrEqual(ROOM);
  });

  it('counts the incidents open when the updates and the others would not fit together', () => {
    const l = line([incident('a', 'major', 240, EIGHT), incident('b', 'minor', 60, [0, 30]), incident('c', 'minor', 30, [0])]);
    expect(lead(l).length).toBeLessThanOrEqual(ROOM);
    expect(l).toMatch(/^3 incidents open; 1 service degraded/);
  });

  it('stays in its room however many updates and incidents there are', () => {
    for (let updates = 1; updates <= 40; updates += 3) {
      for (let open = 1; open <= 12; open += 1) {
        const incidents = Array.from({ length: open }, (_, i) => incident(String(i), i ? 'minor' : 'major', 3_000, Array.from({ length: updates }, (_, u) => u * 37)));
        expect(lead(line(incidents)).length, `${updates} updates, ${open} open`).toBeLessThanOrEqual(ROOM);
      }
    }
  });
});
