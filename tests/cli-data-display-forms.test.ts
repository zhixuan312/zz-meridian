import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// FR-19 (AC-3.1): the data-display standard names each new form where a reader chooses one, and the Bar list's
// README no longer says its rows are always sorted.

const read = (p: string) => fs.readFileSync(path.join(import.meta.dirname, '..', p), 'utf8');
const doc = read('docs/data-display.md');
const choose = doc.slice(doc.indexOf('## Choose the form first'), doc.indexOf('\n## ', doc.indexOf('## Choose the form first') + 1));
/** The rows of the "Choose the form first" table, each as its three cells. */
const rows = choose.split('\n').filter((l) => /^\|(?!\s*-)/.test(l)).slice(1).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
const card = (name: string) => rows.filter((r) => r[2] === name).map((r) => `${r[0]} | ${r[1]}`.toLowerCase());

describe('"Choose the form first" names each new form', () => {
  it('bars in the order given, and two values a row, as Bar list rows', () => {
    expect(card('Bar list').some((r) => /order given/.test(r))).toBe(true);
    expect(card('Bar list').some((r) => /earlier|compare|two values/.test(r))).toBe(true);
  });

  it('signed rows about zero, as Diverging bars', () => {
    expect(card('Diverging bars').length).toBeGreaterThan(0);
  });

  it('grouped columns, as a Column chart row', () => {
    expect(card('Column chart').some((r) => /side by side|grouped/.test(r))).toBe(true);
  });

  it('straight and step lines, as Trend chart rows', () => {
    expect(card('Trend chart').some((r) => /straight|few readings/.test(r))).toBe(true);
    expect(card('Trend chart').some((r) => /step|changes at/.test(r))).toBe(true);
  });

  it('a held scale and an estimate, each with its rule', () => {
    expect(rows.some((r) => /held scale|same scale|one scale/i.test(r.join(' ')))).toBe(true);
    expect(rows.some((r) => /estimate/i.test(r.join(' ')))).toBe(true);
  });
});

it('the Bar list README no longer says its rows are always sorted', () => {
  const readme = read('src/components/charts/bar-list/README.md');
  expect(readme).not.toMatch(/^- Do sort by value, largest first\.$/m);
  expect(readme).toMatch(/order="given"/);
});
