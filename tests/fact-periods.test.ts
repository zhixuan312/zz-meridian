// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { periods } from '@/lib/facts';
import { ordinal } from '@/lib/format';

/** What a record is handed: a page's figure a whole period at a time, counted back from the latest day. */
describe('the periods of a history', () => {
  const days = Array.from({ length: 10 }, (_, i) => i + 1);

  it('are the sums of each whole window, counted back from the latest, oldest first', () => {
    expect(periods(days, 5)).toEqual([15, 40]);
    expect(periods(days, 10)).toEqual([55]);
    expect(periods(days, 1)).toEqual(days);
  });

  it('leave out a window short of the length, which is the oldest days', () => {
    // 10 days in threes: 8 to 10, 5 to 7 and 2 to 4; day 1 alone is no period.
    expect(periods(days, 3)).toEqual([9, 18, 27]);
    expect(periods(days, 11)).toEqual([]);
    expect(periods([], 7)).toEqual([]);
    expect(periods(days, 0)).toEqual([]);
  });
});

describe('an ordinal', () => {
  it('takes the ending of its last digit, and th for eleven to thirteen in every hundred', () => {
    expect([1, 2, 3, 4, 10, 11, 12, 13, 20, 21, 22, 23, 101, 111, 112, 113, 122].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '10th', '11th', '12th', '13th', '20th', '21st', '22nd', '23rd', '101st', '111th', '112th', '113th', '122nd']);
  });
});
