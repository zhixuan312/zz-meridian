// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { phoneHeadProblem } from '../scripts/lib/table-head.ts';

// A table head that draws on a phone is a band of stray column names above the cards; it must keep its words for a screen
// reader and draw no box (sr-only cells, rows as display: contents).
describe('a table head on a phone', () => {
  it('is a problem when it draws any box, and none when it is visually hidden or the width is a desk', () => {
    expect(phoneHeadProblem(390, 36, false)).toMatch(/36px/);
    expect(phoneHeadProblem(390, 1, false)).toBeNull();
    expect(phoneHeadProblem(390, 36, true)).toBeNull();
    expect(phoneHeadProblem(1024, 36, false)).toBeNull();
  });
});
