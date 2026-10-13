// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { nav } from '@/app.config';
import { chromeAccess, may } from '@/data/access';
import { collections } from '@/data/collections';
import { ACTIONS, FEATURES } from '@/data/features';
import { assistantTools } from '@/lib/assistant/tools';
import { viewTools } from '@/views/tools';

const ROOT = path.resolve(import.meta.dirname, '..');
const DESTINATIONS = [
  { feature: 'tickets', href: '/operations-tickets', label: 'Tickets', folder: 'app/(dashboard)/operations-tickets' },
  { feature: 'tests', href: '/tests', label: 'Tests', folder: 'app/(dashboard)/tests' },
  { feature: 'releases', href: '/releases', label: 'Releases', folder: 'app/(dashboard)/releases' },
] as const;
const PERSONAS = ['members_1', 'members_2', 'members_4', 'members_5', 'members_12'];
const items = nav.flatMap((g) => g.items);
const has = (file: string) => fs.existsSync(path.join(ROOT, file));
const source = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

beforeEach(() => { jar.value = undefined; });

describe('the three engineering destinations are registered', () => {
  it('as features that ask to read their own collection', () => {
    const features = FEATURES as Record<string, { title: string; needs: unknown }>;
    for (const d of DESTINATIONS) expect(features[d.feature], d.feature).toEqual({ title: d.label, needs: `${d.feature}:read` });
  });

  it('with two actions, both on tickets: nothing can be done to a verification run or a release', () => {
    const actions = ACTIONS as Record<string, { feature: string; needs: unknown }>;
    expect(actions['create-ticket']).toMatchObject({ feature: 'tickets', needs: 'tickets:create' });
    expect(actions['update-ticket']).toMatchObject({ feature: 'tickets', needs: 'tickets:update' });
    expect(Object.values(actions).filter((a) => a.feature === 'tests' || a.feature === 'releases')).toEqual([]);
    expect(Object.entries(actions).filter(([, a]) => a.feature === 'tickets').map(([id]) => id).sort()).toEqual(['create-ticket', 'update-ticket']);
  });

  it('in the navigation, each asking what its feature asks, by reference', () => {
    const features = FEATURES as Record<string, { needs: unknown }>;
    for (const d of DESTINATIONS) {
      const item = items.find((i) => i.href === d.href);
      expect(item?.label, d.href).toBe(d.label);
      expect(item!.needs, d.href).toBe(features[d.feature].needs);
    }
  });

  it('for every persona: all five read all three, and only a Viewer may not write a ticket', async () => {
    for (const id of PERSONAS) {
      jar.value = id;
      const { only } = await chromeAccess();
      for (const d of DESTINATIONS) expect(only, `${id} reaches ${d.href}`).toContain(d.href);
      expect(await may('tickets:create'), id).toBe(id !== 'members_12');
      expect(await may('tickets:update'), id).toBe(id !== 'members_12');
    }
  });
});

describe('each destination is a page', () => {
  it('with its route and its loading state, behind its gate', () => {
    for (const d of DESTINATIONS) {
      for (const file of ['page.tsx', 'loading.tsx']) expect(has(`${d.folder}/${file}`), `${d.folder}/${file}`).toBe(true);
      expect(source(`${d.folder}/page.tsx`), d.folder).toContain(`gate('${d.feature}')`);
    }
  });

  it('and only tickets has server actions: the other two change nothing', () => {
    expect(has('app/(dashboard)/operations-tickets/actions.ts')).toBe(true);
    for (const folder of ['app/(dashboard)/tests', 'app/(dashboard)/releases']) {
      expect(fs.readdirSync(path.join(ROOT, folder)).filter((f) => /^actions?\./.test(f)), folder).toEqual([]);
      expect(source(`${folder}/page.tsx`), folder).not.toMatch(/['"]use server['"]/);
    }
  });
});

describe('each destination is a view an assistant can open', () => {
  it('under its feature\'s name and need, at its own address, for anyone who may read it', async () => {
    const features = FEATURES as Record<string, { needs: unknown }>;
    jar.value = 'members_12';
    for (const d of DESTINATIONS) {
      const tool = viewTools.find((t) => t.name === d.feature);
      expect(tool, d.feature).toBeTruthy();
      expect(tool!.needs, d.feature).toBe(features[d.feature].needs);
      const { context } = await tool!.read({});
      expect(context, d.feature).toMatchObject({ view: d.feature, address: d.href });
      expect(context.facts.length, d.feature).toBeGreaterThan(0);
    }
  });

  it('and refuses somebody with no session', async () => {
    jar.value = 'members_999';
    for (const d of DESTINATIONS) await expect(viewTools.find((t) => t.name === d.feature)!.read({}), d.feature).rejects.toBeTruthy();
  });
});

describe('what an agent may do to the three collections', () => {
  const guard = { authorize: async () => true, invalidate: () => {} };
  const { tools } = assistantTools(collections, { write() {}, merge() {}, onError: undefined } as never, guard);
  const named = Object.keys(tools);

  it('is look anything up, create and change a ticket, and nothing else', () => {
    expect(named.filter((n) => n.endsWith('_tickets')).sort()).toEqual(['create_tickets', 'query_tickets', 'update_tickets']);
    expect(named.filter((n) => n.endsWith('_tests'))).toEqual(['query_tests']);
    expect(named.filter((n) => n.endsWith('_releases'))).toEqual(['query_releases']);
  });
});
