// @vitest-environment node
// A figure that carries a business definition is computed once, in the logic layer, and the card draws the answer.
import { describe, expect, it } from 'vitest';
import * as logic from '@/logic/derivations';


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

});
