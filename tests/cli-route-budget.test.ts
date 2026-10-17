// @vitest-environment node
// A navigation check's own budget stands in for the shared warm figure on the metric and device it names, in
// scripts/navigate.ts and scripts/perf.ts alike; cold and after-live keep the shared figures. Before, perf.ts judged
// the start guide's phone shell against the shared 250 ms while its own budget was 300 ms.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { budgetsOf, limitsFor, type NavigationCheck } from '../scripts/lib/budgets.ts';

const budgets = budgetsOf({});
const check: NavigationCheck = { path: '/a', title: 'A', readySelector: 'main', probe: 'link', controlSelector: 'a', resultSelector: 'h1', budget: { shellMs: { phone: 300 } } };

describe('limitsFor', () => {
  it("a route's own figure replaces the warm one it names, and nothing else", () => {
    expect(limitsFor(budgets, 'warm', 'phone', check)).toEqual({ shell: 300, data: 1500, interactive: 2000 });
    expect(limitsFor(budgets, 'warm', 'desktop', check)).toEqual({ shell: 150, data: 500, interactive: 750 });
  });
  it('cold and after-live keep the shared figures', () => {
    expect(limitsFor(budgets, 'cold', 'phone', check)).toEqual({ shell: 1500, data: 3000, interactive: 4000 });
    expect(limitsFor(budgets, 'afterLive', 'phone', check)).toEqual({ shell: 1500, data: 3000, interactive: 4000 });
  });
  it('a route with no check is held to the shared figures', () => {
    expect(limitsFor(budgets, 'warm', 'phone', undefined)).toEqual({ shell: 250, data: 1500, interactive: 2000 });
  });
  it('both suites take their limits from it', () => {
    for (const rel of ['scripts/navigate.ts', 'scripts/perf.ts']) {
      const text = fs.readFileSync(path.resolve(import.meta.dirname, '..', rel), 'utf8');
      expect(text, rel).toMatch(/limitsFor\(/);
      expect(text, rel).not.toMatch(/BUDGET_KEY\[m\]\]\[device\]/);
    }
  });
});
