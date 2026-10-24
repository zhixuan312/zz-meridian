// @vitest-environment node
// One read implementation, one cache: the in-scope reads are the reads, and the module that reads two collections for
// one figure goes through them rather than reaching for a collection's query.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as reads from '@/data/read';

const ROOT = path.resolve(import.meta.dirname, '..');
const source = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('the in-scope reads', () => {
  it('exist alongside the resolving ones', () => {
    for (const name of ['read', 'readAll', 'aggregate', 'readInScope', 'readAllInScope', 'aggregateInScope'] as const) {
      expect(typeof (reads as Record<string, unknown>)[name], name).toBe('function');
    }
  });

  it('are what the resolving reads delegate to, so there is one implementation', () => {
    const text = source('src/data/read.ts');
    // Each resolving read asks the request's own scope and hands it on: a body that resolved and then read for itself
    // would be the second implementation this function exists to prevent.
    for (const [resolving, inScope] of [['read', 'readInScope'], ['readAll', 'readAllInScope'], ['aggregate', 'aggregateInScope']] as const) {
      const at = text.indexOf(`export async function ${resolving}(`);
      expect(at, resolving).toBeGreaterThan(-1);
      const body = text.slice(at, text.indexOf('\n}', at));
      expect(body, `${resolving} resolves`).toMatch(/resolveAccess\(\)/);
      expect(body, `${resolving} delegates to ${inScope}`).toMatch(new RegExp(`\\b${inScope}\\(`));
    }
  });

  it('are what Usage reads through', () => {
    const usage = source('src/data/usage.ts');
    expect(usage).not.toMatch(/\.query\(/);
    expect(usage).toMatch(/\b(readAllInScope|readInScope|aggregateInScope)\(/);
  });

  it('takes the tickets join through its name, because a Viewer may read tickets and not members', () => {
    // FR-8 says tickets.ts keeps its one lookup. It keeps it as a named join on the read surface: names only, never a
    // row, and no members:read asked of a Viewer who may read tickets — the property
    // tests/workspace-data-paths.test.ts asserts.
    const tickets = source('src/data/tickets.ts');
    expect(tickets, 'tickets still read through the read surface').toMatch(/readAll\(/);
    expect(tickets, 'the join went through its name').toMatch(/\bmemberNamesFor\(/);
    expect(tickets, 'no data module reaches for a collection query').not.toMatch(/\.query\(/);
    // The join exists beside the reads it is not one of, and says in a comment what it is.
    const lines = source('src/data/read.ts').split('\n');
    const at = lines.findIndex((line) => /export (async )?function memberNamesFor\(/.test(line));
    expect(at, 'the join exists on the read surface').toBeGreaterThan(0);
    const near = lines.slice(Math.max(0, at - 4), at + 1);
    expect(near.some((line) => /^\s*(\/\/|\*)/.test(line)), 'the join carries a comment').toBe(true);
    expect(near.join('\n'), 'the join states its reason').toMatch(/(names? only|not a members read|join)/i);
  });
});
