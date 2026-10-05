// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { offenders } from '../scripts/route-policy.ts';

const routes = [
  { path: '/', kind: 'partial' }, { path: '/health', kind: 'static' }, { path: '/members', kind: 'dynamic' },
  { path: '/api/live', kind: 'dynamic' }, { path: '/reports', kind: 'dynamic' },
] as { path: string; kind: 'static' | 'partial' | 'dynamic' }[];

describe('the route policy', () => {
  it('lists every non-API route that is neither static nor partial', () => expect(offenders(routes, [])).toEqual(['/members', '/reports']));
  it('accepts a declared request-dependent route that gives its reason', () => {
    expect(offenders(routes, [{ path: '/reports', reason: 'Reads the signed-in user on every request.' }])).toEqual(['/members']);
  });
  it('refuses a declaration without a reason, or for a route that does not exist', () => {
    expect(() => offenders(routes, [{ path: '/reports', reason: ' ' }])).toThrow(/reason/);
    expect(() => offenders(routes, [{ path: '/nowhere', reason: 'x' }])).toThrow(/nowhere/);
  });
});
