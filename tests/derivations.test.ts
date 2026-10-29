// @vitest-environment node
// A figure that carries a business definition is computed once, in the logic layer, and the card draws the answer.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as logic from '@/logic/derivations';

const ROOT = path.resolve(import.meta.dirname, '..');
const source = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('the derivations', () => {
  it('are exported by the logic layer', () => {
    for (const name of ['comparison', 'trendTotals', 'columnFold', 'compositionTotal'] as const) {
      expect(typeof (logic as Record<string, unknown>)[name], name).toBe('function');
    }
  });

  it('compute the figure from the values they are given', () => {
    // The comparison a tile prints as "2.7× usual": a ratio, and nothing when there is no baseline to compare with.
    expect(logic.comparison(270, 100)).toBe('2.7');
    expect(logic.comparison(270, 0)).toBeNull();
    // A trend is bands by days — the chart's series as a matrix of values — so each day's total sums down the rows.
    expect(logic.trendTotals([[1, 2], [3, 4]])).toEqual([4, 6]);
    // A day no band measured has no total, never a total of zero; a day one band measured is that band's figure.
    expect(logic.trendTotals([[1, null, null], [3, null, 2]])).toEqual([4, null, 2]);
    // The composition's own denominator is the sum of its parts, and never zero.
    expect(logic.compositionTotal([{ value: 2 }, { value: 3 }])).toBe(5);
    expect(logic.compositionTotal([])).toBe(1);
    // A part below zero is no share of a whole: it adds nothing, so signed parts never turn the shares of the rest negative.
    expect(logic.compositionTotal([{ value: 12 }, { value: -8 }, { value: 20 }])).toBe(32);
  });

  it('leaves no card computing a figure it can be handed', () => {
    // Each expression the card worked out for itself, by the line it sat on.
    expect(source('src/components/patterns/metric-tile/index.tsx')).not.toMatch(/reading\s*\/\s*baseline/);
    expect(source('src/components/charts/composition-bar/index.tsx')).not.toMatch(/parts\.reduce\(/);
    expect(source('src/components/charts/column-chart/index.tsx')).not.toMatch(/parts\.slice\(0,\s*MOST\s*-\s*1\)/);
    // The per-day total itself: the accumulator over each day's values, not the coordinate map after it, which is geometry.
    expect(source('src/components/charts/trend-chart/index.tsx')).not.toMatch(/acc\[i\]\s*\+=\s*v\s*\?\?/);
  });

  it('has the two cards that already call a pure helper calling it from the logic layer', () => {
    // A helper a card may call is pure over the values it was given, and the summary and the two durations are those:
    // they live in the logic layer, and the cards import them from there, never re-implement them.
    expect(source('src/components/patterns/status-list/index.tsx')).toMatch(/from '@\/logic\/summarise'/);
    expect(source('src/components/patterns/incident-card/index.tsx')).toMatch(/from '@\/logic\/after-start'/);
    expect(source('src/components/patterns/status-list/index.tsx')).not.toMatch(/function summarise\b/);
  });
});
