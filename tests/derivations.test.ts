// @vitest-environment node
// A figure that carries a business definition is computed once, in the logic layer, and the card draws the answer.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as logic from '@/logic/derivations';

const ROOT = path.resolve(import.meta.dirname, '..');
const source = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('the derivations', () => {
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

  it('fold the columns past the most a chart draws into one part of the rest, by column', () => {
    // Under the limit every part is kept, padded to the longest with no value rather than zero.
    expect(logic.columnFold([[1, 2], [3]], 3)).toEqual({ values: [[1, 2], [3, null]], kept: 2, folded: false });
    // Past it, the first most - 1 are kept and the rest summed by column; a column none of the rest measured stays empty.
    expect(logic.columnFold([[1, 1], [2, 2], [3, null], [4, null]], 3)).toEqual({ values: [[1, 1], [2, 2], [7, null]], kept: 2, folded: true });
  });

  it('leaves no card computing a figure it can be handed', () => {
    // Each card takes its figure from the logic layer. The second check is the expression the card once worked out for
    // itself, in the spelling it had: it catches that line coming back, not the same sum written another way.
    const cards = [
      ['src/components/patterns/metric-tile/index.tsx', 'comparison', /reading\s*\/\s*baseline/],
      ['src/components/charts/composition-bar/index.tsx', 'compositionTotal', /parts\.reduce\(/],
      ['src/components/charts/column-chart/index.tsx', 'columnFold', /parts\.slice\(0,\s*MOST\s*-\s*1\)/],
      // The per-day total, not the coordinate map after it, which is geometry.
      ['src/components/charts/trend-chart/index.tsx', 'trendTotals', /acc\[i\]\s*\+=\s*v\s*\?\?/],
    ] as const;
    for (const [file, helper, old] of cards) {
      expect(source(file), file).toMatch(new RegExp(`import \\{[^}]*\\b${helper}\\b[^}]*\\} from '@/logic/derivations'`));
      expect(source(file), file).not.toMatch(old);
    }
  });

  it('has the two cards that already call a pure helper calling it from the logic layer', () => {
    // A helper a card may call is pure over the values it was given, and the summary and the two durations are those:
    // they live in the logic layer, and the cards import them from there, never re-implement them.
    expect(source('src/components/patterns/status-list/index.tsx')).toMatch(/from '@\/logic\/summarise'/);
    expect(source('src/components/patterns/incident-card/index.tsx')).toMatch(/from '@\/logic\/after-start'/);
    expect(source('src/components/patterns/status-list/index.tsx')).not.toMatch(/function summarise\b/);
  });
});
