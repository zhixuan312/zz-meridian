import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarList, type BarItem } from '@/components/charts/bar-list';

// The order given, a held scale and its words, an axis, paired values, and estimates.

const hours: BarItem[] = ['09', '10', '11', '12', '13', '14', '15', '16'].map((h, i) => ({ key: `h${h}`, label: `${h}:00`, value: [40, 90, 20, 60, 10, 70, 30, 50][i] }));
const paired = hours.slice(0, 3).map((h, i) => ({ ...h, compare: [50, 120, null][i] }));
const pair = { label: 'This week', compareLabel: 'Last week' };

const rows = (c: HTMLElement) => [...c.querySelectorAll('li[data-row]')];
const keys = (c: HTMLElement) => rows(c).map((r) => r.getAttribute('data-row'));
const row = (c: HTMLElement, key: string) => c.querySelector(`li[data-row="${key}"]`)!;
const bar = (c: HTMLElement, key: string) => row(c, key).querySelector('[data-bar]');
const compare = (c: HTMLElement, key: string) => row(c, key).querySelector('[data-compare]');
const width = (el: Element | null) => parseFloat((el as HTMLElement).style.width);
const levels = (c: HTMLElement) => [...c.querySelectorAll('[data-level]')].map((e) => e.textContent);
/** An inline style that sets the `background` shorthand, which would draw over the hatch. */
const SHORTHAND = /(^|;)\s*background\s*:/;

describe('order', () => {
  it('sorts by value and folds past the limit by default', () => {
    expect(keys(render(<BarList label="By hour" items={hours} />).container)).toEqual(['h10', 'h14', 'h12', 'h16', 'h09', 'h15', '__others']);
  });

  it('keeps the order given under order="given", and folds nothing', () => {
    expect(keys(render(<BarList label="By hour" order="given" items={hours} />).container)).toEqual(hours.map((h) => h.key));
  });
});

describe('max, a held scale', () => {
  it('draws every bar against max, folds nothing and prints no share', () => {
    const c = render(<BarList label="By hour" max={100} items={hours} />).container;
    expect(rows(c)).toHaveLength(8);
    for (const h of hours) expect(width(bar(c, h.key)), h.key).toBeCloseTo(h.value, 6);
    for (const r of rows(c)) expect(r.getAttribute('title') ?? '').not.toMatch(/% of/);
    expect(c.textContent).not.toMatch(/Scale widened/);
  });

  // A type test: the gate's types check, which reads tests/, fails it if the two props are ever allowed together;
  // at run time a JSX element is always made, so there is nothing to assert here.
  it('refuses max beside total, in its type', () => {
    // @ts-expect-error a held scale is not a share of a total
    void <BarList label="By hour" items={hours} max={100} total={400} />;
  });

  it('widens to the largest value past max, that row filling its track, and names it, the first on a tie', () => {
    const items = [...hours, { key: 'g', label: 'Gamma', value: 140 }, { key: 'd', label: 'Delta', value: 140 }, { key: 'e', label: 'Eta', value: 120 }];
    const c = render(<BarList label="By hour" max={100} order="given" items={items} />).container;
    expect(width(bar(c, 'g'))).toBeCloseTo(100, 6);
    expect(width(bar(c, 'e'))).toBeCloseTo((120 / 140) * 100, 6);
    expect(width(bar(c, 'h10'))).toBeCloseTo((90 / 140) * 100, 6);
    expect(c.querySelector('[data-widened]')?.textContent).toBe('Scale widened to 140 to show Gamma');
  });
});

describe('axis', () => {
  it('draws the held levels of max, with a gridline at each', () => {
    const c = render(<BarList label="By hour" max={100} axis items={hours} />).container;
    expect(levels(c)).toEqual(['0', '25', '50', '75', '100']);
    expect(c.querySelectorAll('[data-gridline]')).toHaveLength(5);
  });

  it('adds the widened top as one more level', () => {
    const c = render(<BarList label="By hour" max={100} axis items={[...hours, { key: 'g', label: 'Gamma', value: 140 }]} />).container;
    expect(levels(c)).toEqual(['0', '25', '50', '75', '100', '140']);
    expect(c.querySelectorAll('[data-gridline]')).toHaveLength(6);
  });

  it('without max, draws the nice levels of the largest row and the bars against the last of them', () => {
    const c = render(<BarList label="By hour" axis items={hours} />).container;
    expect(levels(c)).toEqual(['0', '25', '50', '75', '100']);
    expect(width(bar(c, 'h10'))).toBeCloseTo(90, 6);
  });
});

describe('pair', () => {
  it('reads each row as value · compare, and a missing compare as —', () => {
    const c = render(<BarList label="By hour" pair={pair} order="given" items={paired} />).container;
    expect(row(c, 'h09').querySelector('[data-figure]')?.textContent).toBe('40 · 50');
    expect(row(c, 'h10').querySelector('[data-figure]')?.textContent).toBe('90 · 120');
    expect(row(c, 'h11').querySelector('[data-figure]')?.textContent).toBe('20 · —');
  });

  it('draws each compare as an unfilled outline, on the scale of the values and the compares, and none for a missing one', () => {
    const c = render(<BarList label="By hour" pair={pair} order="given" items={paired} />).container;
    expect(width(compare(c, 'h10'))).toBeCloseTo(100, 6);
    expect(width(bar(c, 'h10'))).toBeCloseTo(75, 6);
    expect(width(compare(c, 'h09'))).toBeCloseTo((50 / 120) * 100, 6);
    expect(compare(c, 'h11')).toBeNull();
    const outline = compare(c, 'h09')!.className;
    expect(outline).toMatch(/\bborder-chart-neutral-strong\b/);
    expect(outline).not.toMatch(/\bbg-(?!transparent\b)/);
  });

  it('draws a legend of the two, above the rows', () => {
    const c = render(<BarList label="By hour" pair={pair} items={paired} />).container;
    const legend = c.querySelector('[data-legend]')!;
    expect(legend.textContent).toContain('This week');
    expect(legend.textContent).toContain('Last week');
    expect(legend.compareDocumentPosition(rows(c)[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('folds no row', () => {
    const c = render(<BarList label="By hour" pair={pair} items={hours.map((h) => ({ ...h, compare: h.value - 5 }))} />).container;
    expect(rows(c)).toHaveLength(8);
  });

  it('widens a held scale for a compare past max, naming its row', () => {
    const c = render(<BarList label="By hour" pair={pair} max={100} order="given" items={paired} />).container;
    expect(width(compare(c, 'h10'))).toBeCloseTo(100, 6);
    expect(c.querySelector('[data-widened]')?.textContent).toBe('Scale widened to 120 to show 10:00');
  });
});

describe('estimate', () => {
  it('hatches an estimated bar with its fill a background colour, says so on its row, and writes the key once', () => {
    const c = render(<BarList label="By hour" order="given" items={hours.slice(0, 3).map((h) => ({ ...h, estimate: h.key === 'h10' }))} />).container;
    expect(bar(c, 'h10')!.hasAttribute('data-estimate')).toBe(true);
    expect(bar(c, 'h09')!.hasAttribute('data-estimate')).toBe(false);
    expect(bar(c, 'h10')!.getAttribute('style') ?? '').not.toMatch(SHORTHAND);
    expect(row(c, 'h10').getAttribute('title')).toMatch(/\bestimate\b/);
    expect(c.querySelector('[data-estimate-key]')?.textContent).toBe('Hatched: estimate');
    expect(c.textContent?.match(/Hatched: estimate/g)).toHaveLength(1);
  });

  it('marks a folded row an estimate when it holds one', () => {
    const c = render(<BarList label="By hour" items={hours.map((h) => ({ ...h, estimate: h.key === 'h13' }))} />).container;
    expect(bar(c, '__others')!.hasAttribute('data-estimate')).toBe(true);
  });

  it('never hatches a compare outline', () => {
    const c = render(<BarList label="By hour" pair={pair} order="given" items={paired.map((h) => ({ ...h, estimate: true }))} />).container;
    expect(bar(c, 'h09')!.hasAttribute('data-estimate')).toBe(true);
    expect(c.querySelectorAll('[data-compare][data-estimate]')).toHaveLength(0);
  });

  it('writes nothing about estimates when no row is one', () => {
    const c = render(<BarList label="By hour" items={hours} />).container;
    expect(c.querySelectorAll('[data-estimate]')).toHaveLength(0);
    expect(c.textContent).not.toMatch(/Hatched/);
  });
});

it('stands its lines under the rows in one order: the axis levels, the widening, the key', () => {
  const items = [...hours.slice(0, 3).map((h) => ({ ...h, estimate: h.key === 'h10' })), { key: 'g', label: 'Gamma', value: 140 }];
  const c = render(<BarList label="By hour" max={100} axis order="given" items={items} />).container;
  const [level, widened, key] = [c.querySelector('[data-level]')!, c.querySelector('[data-widened]')!, c.querySelector('[data-estimate-key]')!];
  expect(rows(c).at(-1)!.compareDocumentPosition(level) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(level.compareDocumentPosition(widened) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(widened.compareDocumentPosition(key) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

describe('scale', () => {
  it('draws rows under 1 against the largest row, as rows over 1 are', () => {
    const shares: BarItem[] = [{ key: 'a', label: 'Batch', value: 0.2 }, { key: 'b', label: 'Stream', value: 0.1 }];
    const { container } = render(<BarList label="Share of requests" items={shares} />);
    expect(width(bar(container, 'a'))).toBe(100);
    expect(width(bar(container, 'b'))).toBe(50);
  });

  it('draws nothing for a list whose every row is zero', () => {
    const { container } = render(<BarList label="Errors" items={[{ key: 'a', label: 'Batch', value: 0 }]} />);
    expect(width(bar(container, 'a'))).toBe(0);
  });
});

describe('a total under 1', () => {
  it('prints each row as its share of that total, as its bar draws it', () => {
    const items: BarItem[] = [{ key: 'a', label: 'A', value: 0.25 }, { key: 'b', label: 'B', value: 0.1 }];
    const c = render(<BarList label="Shares" items={items} total={0.5} format={(n) => n.toFixed(2)} />).container;
    expect(row(c, 'a').getAttribute('title')).toContain('50.0% of 0.50');
    expect(width(bar(c, 'a'))).toBe(50);
  });
});
