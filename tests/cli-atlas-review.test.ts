// @vitest-environment node
// Named cli-* so the payload leaves it out: a product removes docs/, and a shipped test may not read it.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const FIELDS = ['scenarioId', 'userJob', 'currentPageOrWidget', 'layer', 'existingSource', 'disposition', 'reason', 'deliveredSource', 'atlasEntry', 'sampleConsumer', 'applicableStates', 'verification'];
type Row = Record<string, string>;
const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const doc = fs.readFileSync(path.join(ROOT, 'docs/atlas-scenario-coverage.md'), 'utf8');

/** The rows of the one table whose header is the twelve fields. */
function inventory(): Row[] {
  const out: Row[] = [];
  let inside = false;
  for (const line of doc.split('\n')) {
    if (!line.trim().startsWith('|')) { inside = false; continue; }
    const c = cells(line);
    if (!inside) { inside = c.join('|') === FIELDS.join('|'); continue; }
    if (c.every((x) => /^:?-+:?$/.test(x))) continue;
    out.push(Object.fromEntries(FIELDS.map((f, i) => [f, c[i] ?? ''])));
  }
  return out;
}
const rows = inventory();
const name = (r: Row) => `${r.scenarioId} · ${r.userJob.slice(0, 40)}`;
const paths = (cell: string) => [...cell.matchAll(/`((?:src|app|docs|scripts|tests|journeys)\/[^`]+)`/g)].map((m) => m[1]);
/** Every address the Atlas serves, asked of the Atlas's own listing. */
const served = spawnSync(process.execPath, ['scripts/vitals.ts', '--atlas', '--list'], { cwd: ROOT, encoding: 'utf8' }).stdout.split('\n').filter((l) => l.startsWith('/system'));

describe('the coverage review, finished', () => {
  it('leaves nothing planned: every cell says what is there, or says none and why', () => {
    expect(doc).not.toMatch(/planned: Phase/);
    for (const r of rows) for (const f of FIELDS) expect(r[f].length, `${name(r)}: ${f}`).toBeGreaterThan(0);
  });

  it('points every row at an Atlas entry that is served, or says there is none and why', () => {
    expect(served.length).toBeGreaterThan(100);
    for (const r of rows) {
      const hrefs = [...r.atlasEntry.matchAll(/`(\/system[^`]*)`/g)].map((m) => m[1]);
      if (!hrefs.length) { expect(r.atlasEntry, name(r)).toMatch(/^none: \S.{10,}/); continue; }
      for (const href of hrefs) expect(served, `${name(r)}: ${href}`).toContain(href);
    }
  });

  it('gives every mandatory job an Atlas entry and a consumer in the product', () => {
    for (const r of rows.filter((x) => /^S\d+$/.test(x.scenarioId))) {
      expect(r.atlasEntry, name(r)).toMatch(/`\/system\//);
      expect(r.sampleConsumer, name(r)).not.toMatch(/^none\b/);
      expect(['keep', 'compose', 'replace', 'remove'], name(r)).toContain(r.disposition);
    }
  });

  it('names, for every row that is built, a check that runs and exists', () => {
    for (const r of rows.filter((x) => x.disposition !== 'defer')) {
      const checks = paths(r.verification).filter((p) => /^(tests|journeys|scripts)\//.test(p));
      expect(checks.length, `${name(r)}: ${r.verification}`).toBeGreaterThan(0);
      for (const p of checks) expect(fs.existsSync(path.join(ROOT, p)), `${name(r)}: ${p}`).toBe(true);
    }
  });

  it('says of every deferred candidate that nothing was built, and what would bring it back', () => {
    const deferred = rows.filter((x) => x.disposition === 'defer');
    expect(deferred.map((r) => r.scenarioId).sort()).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A8']);
    for (const r of deferred) {
      for (const f of ['deliveredSource', 'applicableStates', 'verification']) expect(r[f], `${name(r)}: ${f}`).toMatch(/^none\b/);
      expect(r.reason.length, name(r)).toBeGreaterThan(80);
    }
  });

  it('has the product itself as a row: layer 5, the three workspaces, at their Atlas entry', () => {
    const product = rows.filter((r) => r.layer === 'L5');
    expect(product.length).toBeGreaterThan(0);
    for (const r of product) expect(r.atlasEntry, name(r)).toContain('`/system/products/workspaces`');
    expect(product.some((r) => paths(r.deliveredSource).includes('docs/product-workspaces.md'))).toBe(true);
  });

  it('has a row for each thing the review removed, saying what does its job now', () => {
    const removed = rows.filter((r) => r.disposition === 'remove');
    expect(removed.length).toBeGreaterThan(3);
    for (const r of removed) {
      expect(paths(r.deliveredSource).length, `${name(r)}: what does its job now`).toBeGreaterThan(0);
      expect(r.reason.length, name(r)).toBeGreaterThan(60);
    }
  });

  it('says what it found: the cards the product does not draw, the figures it kept, and the page a customer does not have', () => {
    expect(doc).toMatch(/^## What the review found$/m);
    const notes = doc.slice(doc.indexOf('## What the review found'), doc.indexOf('## Files added, changed and retired'));
    for (const card of ['Breadcrumb', 'Progress', 'Radio group', 'Tabs']) expect(notes, card).toContain(card);
    expect(notes).toMatch(/heatmap/i);
    expect(notes).toMatch(/\bS3\b/);
  });
});

describe('the files the work added, changed and retired', () => {
  const at = doc.indexOf('## Files added, changed and retired');
  const table = doc.slice(at).split('\n').filter((l) => l.trim().startsWith('|')).map(cells).filter((c) => c.length === 3 && c[0] !== 'path' && !c.every((x) => /^:?-+:?$/.test(x)));

  it('are listed after the findings, each with what happened to it and who uses it', () => {
    expect(at).toBeGreaterThan(doc.indexOf('## What the review found'));
    expect(table.length).toBeGreaterThan(10);
    for (const [file, change, consumers] of table) {
      expect(['added', 'changed', 'retired'], file).toContain(change);
      expect(consumers.length, file).toBeGreaterThan(3);
    }
    for (const change of ['added', 'changed', 'retired']) expect(table.filter((c) => c[1] === change).length, change).toBeGreaterThan(0);
  });

  it('are there when the list says added or changed, and gone when it says retired', () => {
    for (const [file, change] of table) expect(fs.existsSync(path.join(ROOT, file.replace(/`/g, ''))), `${file}: ${change}`).toBe(change !== 'retired');
  });
});
