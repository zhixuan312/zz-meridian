// @vitest-environment node
// Named cli-* so the payload leaves it out: a product removes docs/, and a shipped test may not read it.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const FIELDS = ['scenarioId', 'userJob', 'currentPageOrWidget', 'layer', 'existingSource', 'disposition', 'reason', 'deliveredSource', 'atlasEntry', 'sampleConsumer', 'applicableStates', 'verification'];
const DISPOSITIONS = ['keep', 'compose', 'replace', 'remove', 'defer'];

type Row = Record<string, string>;
const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/** The rows of the one table whose header is the twelve fields; any other table in the document is left alone. */
function inventory(): Row[] {
  const out: Row[] = [];
  let inside = false;
  for (const line of fs.readFileSync(path.join(ROOT, 'docs/atlas-scenario-coverage.md'), 'utf8').split('\n')) {
    if (!line.trim().startsWith('|')) { inside = false; continue; }
    const c = cells(line);
    if (!inside) { inside = c.join('|') === FIELDS.join('|'); continue; }
    if (c.every((x) => /^:?-+:?$/.test(x))) continue;
    out.push(Object.fromEntries(FIELDS.map((f, i) => [f, c[i] ?? ''])));
  }
  return out;
}

/** Every folder under `dir` that holds `file`, as a path from the repository root. */
function foldersWith(dir: string, file: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).filter((e) => e.isDirectory()).flatMap((e) => {
    const here = `${dir}/${e.name}`;
    return [...(fs.existsSync(path.join(ROOT, here, file)) ? [here] : []), ...foldersWith(here, file)];
  });
}

const names = (cell: string, folder: string) => cell.includes('`' + folder + '`');
const rows = inventory();

describe('the inventory of the whole sample', () => {
  it('is one table with the twelve fields the spec names', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('has a row for every mandatory scenario and every adjacent candidate', () => {
    const ids = rows.flatMap((r) => r.scenarioId.split(/[^A-Za-z0-9]+/));
    for (let n = 1; n <= 12; n++) expect(ids, `S${n}`).toContain(`S${n}`);
    for (let n = 1; n <= 8; n++) expect(ids, `A${n}`).toContain(`A${n}`);
  });

  it('accounts for every page the sample has', () => {
    for (const folder of foldersWith('app', 'README.md')) expect(rows.some((r) => names(r.existingSource, folder)), folder).toBe(true);
  });

  it('accounts for the shell and for every pattern and chart', () => {
    const widgets = ['src/components/base/shell', ...foldersWith('src/components/patterns', 'README.md'), ...foldersWith('src/components/charts', 'README.md')];
    for (const folder of widgets) expect(rows.some((r) => names(r.existingSource, folder)), folder).toBe(true);
  });

  it('gives every row a disposition and a reason, and defers only an adjacent candidate', () => {
    for (const r of rows) {
      expect(DISPOSITIONS, r.currentPageOrWidget).toContain(r.disposition);
      expect(r.reason.length, r.currentPageOrWidget).toBeGreaterThan(11);
      if (r.disposition === 'defer') expect(r.scenarioId, r.currentPageOrWidget).toMatch(/^A\d$/);
    }
  });

  it('names only sources that exist', () => {
    for (const r of rows) {
      for (const cell of [r.existingSource, r.deliveredSource]) {
        for (const m of cell.matchAll(/`((?:src|app|docs|scripts|tests)\/[^`]+)`/g)) expect(fs.existsSync(path.join(ROOT, m[1])), m[1]).toBe(true);
      }
    }
  });

  it('records the walking slice: the records template, its Atlas entry and the page built from it', () => {
    expect(rows.some((r) => names(r.deliveredSource, 'src/components/templates/records') && r.atlasEntry.includes('/system/pages/template-records') && r.sampleConsumer.includes('/customers'))).toBe(true);
  });
});
