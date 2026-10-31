// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { chromeAccess } from '@/data/access';
import { read } from '@/data/read';
import { viewTools } from '@/logic/tools';
import { navOf, WORKSPACE_IDS } from '@/views/workspaces';
import { blankedText, resolveSpec, valueImports } from '../scripts/lib/layer-rules.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
/**
 * The template's own repository keeps the Atlas. A project made by `create` has it removed (`scripts/brand.ts` deletes
 * `app/system`), and the two entries that lead there go with it: the same declaration then holds thirteen destinations.
 */
const ATLAS = fs.existsSync(path.join(ROOT, 'app/system')) ? ['/system', '/system/start/start-a-dashboard'] : [];
const PERSONAS = { owner: 'members_1', admin: 'members_2', member: 'members_4', keyManager: 'members_5', viewer: 'members_12' };
/** What a person is shown of a workspace: its declared entries, less the ones they may not open. */
const shown = async (id: (typeof WORKSPACE_IDS)[number]) => {
  const { only } = await chromeAccess();
  return navOf(id).flatMap((g) => g.items).map((i) => i.href).filter((href) => only.includes(href));
};

beforeEach(() => { jar.value = undefined; });

describe('every persona enters every workspace', () => {
  it('finds something to open in each of the three', async () => {
    for (const id of Object.values(PERSONAS)) {
      jar.value = id;
      for (const workspace of WORKSPACE_IDS) expect((await shown(workspace)).length, `${id} in ${workspace}`).toBeGreaterThan(0);
    }
  });

  it('sees every destination, unless they are a Viewer', async () => {
    for (const id of [PERSONAS.owner, PERSONAS.admin, PERSONAS.member, PERSONAS.keyManager]) {
      jar.value = id;
      expect((await Promise.all(WORKSPACE_IDS.map(shown))).map((hrefs) => hrefs.length), id).toEqual([3 + ATLAS.length, 4, 6]);
    }
  });
});

describe('a Viewer', () => {
  beforeEach(() => { jar.value = PERSONAS.viewer; });

  it('reaches everything but Members and API keys', async () => {
    expect(await shown('main')).toEqual(['/', '/settings', ...ATLAS]);
    expect(await shown('business')).toEqual(['/business', '/customers', '/usage', '/requests']);
    expect(await shown('engineering')).toEqual(['/engineering', '/services', '/operations-tickets', '/tests', '/releases']);
  });

  it('cannot read members or keys, by the read or by the view an assistant opens', async () => {
    for (const name of ['members', 'keys']) {
      await expect(read(name), name).rejects.toBeTruthy();
      await expect(viewTools.find((t) => t.name === name)!.read({}), name).rejects.toBeTruthy();
    }
  });
});

describe('a workspace is where a person looks, not what they may do', () => {
  it('is not imported by any access-deciding module, even through another module', () => {
    const deciding = ['src/data/access.ts', 'src/data/roles.ts', 'src/data/read.ts', 'src/data/features.ts', 'src/data/ticket-mutations.ts', 'src/data/member-mutations.ts'];
    for (const start of deciding) {
      const seen = new Set([start]);
      const queue = [[start]];
      while (queue.length) {
        const trail = queue.shift()!;
        const file = trail.at(-1)!;
        const code = blankedText(fs.readFileSync(path.join(ROOT, file), 'utf8'));
        for (const { spec } of valueImports(code)) {
          const target = resolveSpec(file, spec, [['@/', 'src/']], ROOT);
          if (!target) continue;
          expect(target, [...trail, target].join(' -> ')).not.toBe('src/views/workspaces.ts');
          if (!seen.has(target)) {
            seen.add(target);
            queue.push([...trail, target]);
          }
        }
      }
    }
  });
});
