import { act, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 720, height: 240 }] as const };
});

import { Home } from 'lucide-react';
import { BarList } from '@/components/charts/bar-list';
import { DivergingBars } from '@/components/charts/diverging-bars';
import { Freshness } from '@/components/patterns/freshness';
import { MetricTile } from '@/components/patterns/metric-tile';
import { Rail } from '@/components/patterns/rail';
import { StatusList } from '@/components/patterns/status-list';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardHeader } from '@/components/ui/card';
import { KeyValue } from '@/components/ui/key-value';
import { Pagination } from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';

/**
 * A text a card may cut with an ellipsis keeps the whole of itself where a pointer reaches it: a `title` on the cut
 * element, on what holds it, or on the one thing inside it. The audit holds every page to this at run time, but only on
 * text that is long at the widths it renders, and the sample's names are short: a Card heading (#33), a tile's label
 * (#51), the rail's product name (#79) and a key's value (#89) each reached an adopter first. So every card that cuts
 * text is drawn here with text far longer than any box, and every cut element must keep it.
 */
const LONG = 'Median hours until abandoned work stopped, across every team and region this quarter';
const NOW = new Date(Date.UTC(2026, 9, 27, 12));

const DRAWN: Record<string, ReactElement> = {
  Progress: <Progress value={3} max={10} label={LONG} />,
  StatusList: <StatusList end={NOW} services={[{ name: LONG, description: 'Serves every request', status: 'operational', uptime: 0.999, latency: 120, days: Array.from({ length: 90 }, () => 'operational' as const) }]} />,
  Pagination: <Pagination page={2} pageSize={20} total={1_234_567} onPageChange={() => {}} />,
  Freshness: <Freshness updatedAt={new Date(NOW.getTime() - 3 * 60_000)} now={NOW} />,
  'Freshness run': <Freshness run updatedAt={new Date(NOW.getTime() - 3 * 86_400_000)} now={NOW} />,
  BarList: <BarList label="By team" items={[{ key: 'a', label: LONG, value: 40 }, { key: 'b', label: `${LONG} again`, value: 12, href: '/teams/b' }]} />,
  DivergingBars: <DivergingBars label="By team" items={[{ key: 'a', label: LONG, value: 40 }, { key: 'b', label: `${LONG} again`, value: -12, href: '/teams/b' }, { key: 'c', label: `${LONG} unknown`, value: null }]} />,
  MetricTile: <MetricTile label={LONG} value={1234} format="count" />,
  'MetricTile compact': <MetricTile label={LONG} value={1234} format="count" size="compact" />,
  CardHeader: <Card><CardHeader title={LONG} actions={<button type="button">Export</button>} /></Card>,
  KeyValue: <KeyValue items={[{ label: LONG, value: LONG }, { label: 'Route', value: <a href="/x">{LONG}</a>, title: LONG }]} />,
  Breadcrumb: <Breadcrumb items={[{ label: LONG, href: '/a' }, { label: `${LONG} too` }]} />,
  Rail: <Rail nav={[{ label: LONG, items: [{ href: '/', label: LONG, icon: Home, needs: 'public' as const }] }]} user={{ name: LONG, role: LONG }} workspace={LONG} />,
};
// Not here, because they cut nothing a screen reader is given: the Column chart cuts its labels on an axis hidden from
// assistive technology, and pointing at a column draws its label whole; the Detail head wraps its name and its parent.


const whole = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
/** The audit's rule (scripts/audit.ts `titled`): a title on the element or up to eight above it, or on the one inside it, that holds its whole text. */
const keeps = (el: Element) => {
  const own = whole(el.textContent);
  const holds = (t: string | null) => whole(t).length > 0 && whole(t).includes(own);
  for (let n: Element | null = el, i = 0; n && i < 8; n = n.parentElement, i++) if (holds(n.getAttribute('title'))) return true;
  return [...el.querySelectorAll('[title]')].some((n) => holds(n.getAttribute('title')));
};

describe('every card that cuts text keeps the whole of it where a pointer reaches it', () => {
  for (const [name, el] of Object.entries(DRAWN)) {
    it(name, async () => {
      const { container } = render(<Tooltip.Provider>{el}</Tooltip.Provider>);
      await act(async () => {});
      // A cut element a screen reader is not given (aria-hidden, sr-only) is a copy of text drawn elsewhere.
      const cut = [...container.querySelectorAll('[class~="truncate"]')].filter((n) => whole(n.textContent) && !n.closest('[aria-hidden="true"],.sr-only'));
      expect(cut.length, `${name} draws no cut element, so nothing here is checked`).toBeGreaterThan(0);
      const lost = cut.filter((n) => !keeps(n)).map((n) => `<${n.localName} class="${n.getAttribute('class')}"> "${whole(n.textContent).slice(0, 40)}"`);
      expect(lost, `${name} cuts text and keeps it nowhere`).toEqual([]);
    });
  }
});
