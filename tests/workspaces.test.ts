// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { nav, workspaces } from '@/app.config';
import { navOf, WORKSPACE_IDS, workspaceOf } from '@/views/workspaces';

const ROOT = path.resolve(import.meta.dirname, '..');
/**
 * The template's own repository keeps the Atlas. A project made by `create` has it removed (`scripts/brand.ts` deletes
 * `app/system`), and the two entries that lead there go with it: the same declaration then holds thirteen destinations.
 */
const ATLAS: [string, string][] = fs.existsSync(path.join(ROOT, 'app/system')) ? [['/system', 'Design system'], ['/system/start/start-a-dashboard', 'Docs']] : [];
const items = nav.flatMap((g) => g.items);
const entries = (id: (typeof WORKSPACE_IDS)[number]) => navOf(id).flatMap((g) => g.items).map((i) => [i.href, i.label]);

describe('the three workspaces', () => {
  it('each open at a home that is their own entry', () => {
    for (const id of WORKSPACE_IDS) {
      expect(workspaceOf(workspaces[id].homeHref), id).toBe(id);
      expect(entries(id).map(([href]) => href), id).toContain(workspaces[id].homeHref);
    }
  });
});

describe('the navigation as it is declared', () => {
  it('holds each group to one workspace', () => {
    // Not the groups' labels or count: a project made before the sample split Business keeps its three groups, and this holds there too.
    const owners = nav.map((g) => [...new Set(g.items.map((i) => i.workspace))]);
    for (const [n, o] of owners.entries()) expect(o.length, `group ${n}`).toBe(1);
  });
});

describe('the destinations', () => {
  it('are declared once: every entry has one owner, and the three navigations together are the whole of it', () => {
    expect(new Set(items.map((i) => i.href)).size).toBe(items.length);
    for (const i of items) expect(WORKSPACE_IDS, i.href).toContain(i.workspace);
    const derived = WORKSPACE_IDS.flatMap((id) => navOf(id).flatMap((g) => g.items));
    expect(derived.map((i) => i.href).sort()).toEqual(items.map((i) => i.href).sort());
    // Derived, not copied: an entry in a workspace's navigation is the declared entry itself.
    for (const i of derived) expect(items, i.href).toContain(i);
    for (const id of WORKSPACE_IDS) expect(navOf(id).every((g) => g.items.length > 0), id).toBe(true);
  });
});

describe('the workspace a page belongs to', () => {
  it('is the owner of its entry, and a detail inherits its parent on a whole path segment', () => {
    expect(workspaceOf('/')).toBe('main');
    expect(workspaceOf('/requests/req_1')).toBe('business');
    expect(workspaceOf('/customers')).toBe('business');
    expect(workspaceOf('/customers/northwind-labs')).toBe('business');
    expect(workspaceOf('/business')).toBe('business');
    expect(workspaceOf('/engineering')).toBe('engineering');
    expect(workspaceOf('/operations-tickets')).toBe('engineering');
    expect(workspaceOf('/services/')).toBe('engineering');
    // The Atlas's pages are Main's where there is an Atlas, and nobody's where there is none.
    expect(workspaceOf('/system/patterns/rail')).toBe(ATLAS.length ? 'main' : null);
    expect(workspaceOf('/system/start/start-a-dashboard')).toBe(ATLAS.length ? 'main' : null);
  });

  it('is nobody\'s when no entry owns the path: a lookalike is not a detail', () => {
    expect(workspaceOf('/requests-archive')).toBeNull();
    expect(workspaceOf('/services-check')).toBeNull();
    expect(workspaceOf('/nowhere')).toBeNull();
    expect(workspaceOf('/sign-in')).toBeNull();
  });

});
