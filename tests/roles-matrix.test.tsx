// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { matrixRows, RolesMatrix } from '@/views/roles-matrix';
import { ACTIONS, FEATURES } from '@/data/features';
import { ADD_ONS, MAIN_ROLES, whoCan } from '@/data/roles';

describe('the roles and access matrix', () => {
  it('names its columns from the table and its rows from the features and actions', () => {
    const html = renderToStaticMarkup(<RolesMatrix />);
    for (const role of [...MAIN_ROLES, ...ADD_ONS]) expect(html, role).toContain(role);
    for (const [id, action] of Object.entries(ACTIONS)) expect(html, id).toContain(action.label);
    const publicTitles = Object.values(FEATURES).filter((f) => f.needs === 'public');
    for (const f of publicTitles) expect(html.includes(`>${f.title}<`)).toBe(false);
    expect(html).toContain('add-on');
    expect(html).toContain('at least one active Owner');
  });

  it('ticks a column only when its own grants satisfy the whole need', () => {
    for (const row of matrixRows()) expect(row.ticked, row.label).toEqual(whoCan(row.needs));
    const keys = matrixRows().find((r) => r.label === 'API keys')!;
    expect(keys.ticked).toEqual(['Owner', 'Admin', 'Member', 'Key manager']);
    const members = matrixRows().find((r) => r.label === 'Members')!;
    expect(members.ticked).toEqual(['Owner', 'Admin', 'Member']);
    const save = matrixRows().find((r) => r.label === ACTIONS['save-workspace'].label)!;
    expect(save.ticked).toEqual(['Owner']);
  });

  it('follows the table it is built from', async () => {
    vi.resetModules();
    // `whoCan` is replaced beside the table, as every fixture that changes the table must: it closes over the module's
    // own GRANTS, so overriding the export alone would leave the answer unchanged.
    vi.doMock('@/data/roles', async (orig) => {
      const real = await orig<typeof import('@/data/roles')>();
      const GRANTS = { ...real.GRANTS, Viewer: ['days:read', 'keys:read'] } as unknown as typeof real.GRANTS;
      const whoCan = (need: Parameters<typeof real.whoCan>[0]) => {
        const grants = typeof need === 'string' ? [need] : need.allOf;
        return [...real.MAIN_ROLES, ...real.ADD_ONS].filter((role) => grants.every((g) => (GRANTS[role] as readonly string[]).includes(g)));
      };
      return { ...real, GRANTS, whoCan };
    });
    const again = await import('@/views/roles-matrix');
    const keys = again.matrixRows().find((r) => r.label === 'API keys')!;
    expect(keys.ticked).toContain('Viewer');
    vi.doUnmock('@/data/roles');
    vi.resetModules();
  });
});
