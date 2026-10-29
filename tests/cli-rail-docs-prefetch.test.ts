// @vitest-environment node
// The console rail's Docs link resolves the start guide at prefetch. Under partialPrefetching a <Link> prefetches its
// route's App Shell only, and the start guide's article is its [id] page's URL data, which streamed after the press: the
// journey the timed suites take (from /settings, the rail's link) waited 77-146 ms for it on this machine and failed the
// runner's 150 ms desktop budget at 192 ms. A full prefetch sends next-router-prefetch 2 and 3, which the desktop cap
// must count. A cli- test: a created project's nav is its own.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPrefetch } from '../scripts/lib/sizes.ts';

const read = (rel: string) => fs.readFileSync(path.resolve(import.meta.dirname, '..', rel), 'utf8');

describe('the rail', () => {
  const config = read('src/app.config.ts');
  const rail = read('src/components/patterns/rail/index.tsx');
  it('declares the field', () => expect(config).toMatch(/export type NavItem = \{[^}]*\bprefetch\?: true\b/));
  it('asks for the start guide in full, and for no other page', () => {
    const asks = config.split('\n').filter((line) => /\bprefetch: true\b/.test(line));
    expect(asks).toHaveLength(1);
    expect(asks[0]).toContain("label: 'Docs'");
  });
  // The field is `true` or absent, so an item that does not ask passes undefined, Next's default.
  it('honours the field and keeps the default for every other item', () => expect(rail).toContain('prefetch={it.prefetch}'));
});

describe('the prefetch cap', () => {
  it('counts every router prefetch, a full one included', () => {
    for (const v of ['1', '2', '3']) expect(isPrefetch({ headers: { 'next-router-prefetch': v } })).toBe(true);
  });
  it('counts nothing else', () => {
    const none: Record<string, string>[] = [{}, { 'next-router-prefetch': 'null' }, { 'next-router-prefetch': '' }, { 'next-router-prefetch': '0' }];
    for (const headers of none) expect(isPrefetch({ headers })).toBe(false);
  });
});
