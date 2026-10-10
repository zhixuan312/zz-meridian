// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { ACTIONS, FEATURES, type ActionId, type FeatureId } from '@/data/features';
import { nav } from '@/app.config';
import { chromeAccess, may } from '@/data/access';
import fs from 'node:fs';
import path from 'node:path';

const items = nav.flatMap((g) => g.items);
const hrefsOf = (only: string[]) => items.filter((i) => only.includes(i.href)).map((i) => i.href).sort();

/**
 * The template's own repository: the Atlas is still here. A project brought in with `adopt` or `create` has it removed
 * (`scripts/brand.ts` deletes `app/system`), so the eight routes below are the template's and not that project's: its rail
 * is its own. Asserting the template's list in a product failed that product's gate for a project that was right.
 */
const TEMPLATE = fs.existsSync(path.resolve(import.meta.dirname, '../app/system'));

beforeEach(() => { jar.value = undefined; });

describe('the feature table', () => {
  it('declares every feature the spec freezes, with its need', () => {
    expect(Object.keys(FEATURES).sort()).toEqual(['analytics', 'customers', 'docs', 'health', 'keys', 'members', 'overview', 'request', 'requests', 'settings', 'system']);
    const N: Record<string, unknown> = {
      overview: { allOf: ['days:read', 'endpoints:read', 'responses:read', 'activity:read', 'incidents:read'] },
      requests: 'requests:read',
      request: { allOf: ['requests:read', 'endpoints:read'] },
      analytics: { allOf: ['days:read', 'endpoints:read', 'activity:read', 'incidents:read', 'requests:read'] },
      health: { allOf: ['services:read', 'incidents:read'] },
      customers: 'customers:read',
      keys: 'keys:read',
      members: 'members:read',
      settings: 'public',
      system: 'public',
      docs: 'public',
    };
    for (const [id, need] of Object.entries(N)) expect(FEATURES[id as FeatureId].needs).toEqual(need);
    for (const [id, f] of Object.entries(FEATURES)) expect(typeof f.title, id).toBe('string');
  });

  it('declares every action the spec freezes, on its feature', () => {
    const A: Record<string, [string, unknown]> = {
      'create-key': ['keys', 'keys:create'], 'revoke-key': ['keys', 'keys:remove'],
      'invite-member': ['members', 'members:create'], 'change-role': ['members', 'members:update'],
      'suspend-member': ['members', 'members:update'], 'reactivate-member': ['members', 'members:update'],
      'remove-member': ['members', 'members:remove'], 'replay-request': ['request', 'requests:create'],
      'save-workspace': ['settings', { allOf: ['workspace:read', 'workspace:update'] }], 'delete-workspace': ['settings', 'workspace:remove'],
    };
    expect(Object.keys(ACTIONS).sort()).toEqual(Object.keys(A).sort());
    for (const [id, [feature, needs]] of Object.entries(A)) {
      expect(ACTIONS[id as ActionId].feature).toBe(feature);
      expect(ACTIONS[id as ActionId].needs).toEqual(needs);
      expect(typeof ACTIONS[id as ActionId].label, id).toBe('string');
    }
  });

  it('has every nav item reference its feature entry, not restate it', () => {
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.needs, item.href).toBeDefined();
    const known = new Set(Object.values(FEATURES).map((f) => f.needs));
    for (const item of items) expect(known.has(item.needs), `${item.href} restates its need`).toBe(true);
  });
});

describe('the rail asks the table', () => {
  it('gives a Viewer the eight routes and everyone else all ten', async (ctx) => {
    if (!TEMPLATE) ctx.skip('this project replaced the template’s pages: its rail is its own, and these eight routes are the template’s');
    const all = items.map((i) => i.href).sort();
    jar.value = 'members_12';
    expect(hrefsOf((await chromeAccess()).only)).toEqual(['/', '/analytics', '/customers', '/health', '/requests', '/settings', '/system', '/system/start/start-a-dashboard']);
    for (const id of ['members_1', 'members_2', 'members_4', 'members_5']) {
      jar.value = id;
      expect(hrefsOf((await chromeAccess()).only), id).toEqual(all);
    }
  });

  it('answers may for a grant, a composite need and public', async () => {
    jar.value = 'members_12';
    expect(await may('public')).toBe(true);
    expect(await may('requests:read')).toBe(true);
    expect(await may('keys:read')).toBe(false);
    expect(await may({ allOf: ['requests:read', 'endpoints:read'] })).toBe(true);
    expect(await may({ allOf: ['requests:read', 'keys:read'] })).toBe(false);
  });
});
