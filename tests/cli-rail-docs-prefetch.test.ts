// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isPrefetch } from '../scripts/lib/sizes.ts';


describe('the prefetch cap', () => {
  it('counts every router prefetch, a full one included', () => {
    for (const v of ['1', '2', '3']) expect(isPrefetch({ headers: { 'next-router-prefetch': v } })).toBe(true);
  });
  it('counts nothing else', () => {
    const none: Record<string, string>[] = [{}, { 'next-router-prefetch': 'null' }, { 'next-router-prefetch': '' }, { 'next-router-prefetch': '0' }];
    for (const headers of none) expect(isPrefetch({ headers })).toBe(false);
  });
});
