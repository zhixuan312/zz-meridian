// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own page, which a product replaces.
import { describe, expect, it } from 'vitest';
import { contextText } from '@/lib/shared-context';
import { DEMO_NOW, DEMO_UPDATED_AT, INCIDENTS, SERVICES } from '@/system/fixtures/sample';
import { demoSeries } from '@/system/fixtures/company';
import { nowContext, nowHead, type NowData } from '@/views/now-context';

const BUDGET = 2600;
// As a page is handed them: the record without who has it and the id of its ticket.
const open = INCIDENTS.filter((i) => i.state !== 'resolved').map(({ owner: _, ticketId: __, ...incident }) => incident);
const head = nowHead({ services: SERVICES, testing: 3, history: demoSeries('all').current });
const data = (over: Partial<NowData> = {}): NowData => ({ services: SERVICES, current: open[0] ?? null, alsoOpen: open.slice(1), head, updatedAt: DEMO_UPDATED_AT.toISOString(), now: DEMO_NOW.toISOString(), ...over });

describe("Now's context", () => {
  it('names its address, every service as it is now and the open incident', () => {
    const c = nowContext(data());
    const text = contextText(c);
    expect(c.address).toBe('/engineering');
    expect(c.facts.length).toBe(1 + SERVICES.length);
    for (const s of SERVICES) expect(text).toContain(s.name);
    expect(text).toContain(`Open incident "${open[0].title}"`);
  });

  it('fits the budget every context is held to', () => {
    expect(contextText(nowContext(data())).length).toBeLessThanOrEqual(BUDGET);
  });

  it('says that no incident is open, and sends the history to Services', () => {
    const c = nowContext(data({ current: null, alsoOpen: [] }));
    // After the title and the days inside the band, which lead every context of the page.
    expect(c.insights.map((i) => i.text)).toEqual([head.title, `Steady: ${head.facts[0].text}.`, 'No incident is open.']);
    expect(c.unknowns.join(' ')).toContain('/services');
  });

  it('counts every other open incident', () => {
    const c = nowContext(data({ alsoOpen: [open[0], open[0]] }));
    expect(c.insights.map((i) => i.text).join('\n')).toContain('2 other incidents are open');
  });
});
