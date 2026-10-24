// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import fs from 'node:fs';
import path from 'node:path';
import { AccessDenied } from '@/data/access';
import { collections } from '@/data/collections';
import { read } from '@/data/read';
import { usageFigures } from '@/data/usage';
import { viewTools } from '@/logic/tools';

const byName = Object.fromEntries(viewTools.map((t) => [t.name, t]));
beforeEach(() => { jar.value = undefined; });

describe('customers is a collection', () => {
  it('is read-only and holds the sample rows', async () => {
    const customers = collections.find((c) => c.name === 'customers');
    expect(customers, 'no customers collection').toBeTruthy();
    expect(customers!.create ?? customers!.update ?? customers!.remove).toBeUndefined();
    // A read answers a page of them; the total is every record, the nine that have left among them.
    expect((await read('customers')).total).toBe(329);
  });

  it('is named by no page and no view', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(entry.name) && /\bCUSTOMERS\b/.test(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'))) offenders.push(rel);
      }
    };
    // `src/logic` is where the producers that name a raw fixture now live, so it is walked with the pages and the views.
    for (const root of ['app/(dashboard)', 'src/views', 'src/logic']) walk(root);
    expect(offenders).toEqual([]);
  });
});

describe('the workspace is a collection', () => {
  it('holds one record with the identity the settings form shows', async () => {
    const { rows } = await read('workspace');
    expect(rows.length).toBe(1);
    expect(Object.keys(rows[0]).sort()).toEqual(['id', 'name', 'slug']);
  });
});

describe('the usage figures ask for their own grants', () => {
  it('refuses the usage tool to somebody with no session', async () => {
    jar.value = 'members_999';
    await expect(byName.usage.read({ period: '30d' })).rejects.toBeTruthy();
  });

  it('answers the figures to the people who read the dashboards', async () => {
    jar.value = 'members_12';
    const figures = await usageFigures();
    expect(Array.isArray(figures.regions) && figures.regions.length > 0).toBe(true);
    expect(figures.hours.length).toBe(24);
  });

  it('refuses a scope that may not read requests at all', async () => {
    expect((await read('days')).rows.length).toBeGreaterThan(1);
    // A whole scope, for a subject the roster does not have: `allows` re-reads the member and refuses.
    await expect(usageFigures({ tenantId: 'demo', subjectId: 'nobody', authorizationKey: 'demo:nobody:Viewer:' })).rejects.toBeInstanceOf(AccessDenied);
  });
});
