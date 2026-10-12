// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { nav, workspaces } from '@/app.config';
import { navOf, WORKSPACE_IDS, workspaceOf } from '@/views/workspaces';

const ROOT = path.resolve(import.meta.dirname, '..');
const items = nav.flatMap((g) => g.items);
const entries = (id: (typeof WORKSPACE_IDS)[number]) => navOf(id).flatMap((g) => g.items).map((i) => [i.href, i.label]);

describe('the three workspaces', () => {
  it('are declared once, in order, with their labels, their homes and who each is for', () => {
    expect(Object.keys(workspaces)).toEqual(['main', 'business', 'engineering']);
    expect(WORKSPACE_IDS).toEqual(['main', 'business', 'engineering']);
    expect(WORKSPACE_IDS.map((id) => [workspaces[id].label, workspaces[id].homeHref])).toEqual([['Main', '/'], ['Business', '/analytics'], ['Engineering', '/health']]);
    for (const id of WORKSPACE_IDS) expect(workspaces[id].audience.trim().length, id).toBeGreaterThan(20);
  });

  it('each open at a home that is their own entry', () => {
    for (const id of WORKSPACE_IDS) {
      expect(workspaceOf(workspaces[id].homeHref), id).toBe(id);
      expect(entries(id).map(([href]) => href), id).toContain(workspaces[id].homeHref);
    }
  });
});

describe('the navigation as it is declared', () => {
  it('is three groups, one for each workspace in order, none of them labelled', () => {
    expect(nav.map((g) => [g.label, [...new Set(g.items.map((i) => i.workspace))]])).toEqual([[undefined, ['main']], [undefined, ['business']], [undefined, ['engineering']]]);
  });

  it('opens Engineering at a home that says who Engineering is for', () => {
    expect(fs.readFileSync(path.join(ROOT, 'app/(dashboard)/health/page.tsx'), 'utf8')).toMatch(/workspaces\.engineering\.audience/);
  });
});

describe('the thirteen destinations', () => {
  it('each belong to one workspace, under the names and in the order the product declares', () => {
    expect(entries('main')).toEqual([['/', 'Overview'], ['/members', 'Members'], ['/settings', 'Settings'], ['/system', 'Design system'], ['/system/start/start-a-dashboard', 'Docs']]);
    expect(entries('business')).toEqual([['/analytics', 'Analytics'], ['/customers', 'Customers'], ['/requests', 'Requests']]);
    expect(entries('engineering')).toEqual([['/health', 'Operations'], ['/keys', 'API keys'], ['/operations-tickets', 'Operations tickets'], ['/tests', 'Tests and verification'], ['/releases', 'Releases']]);
  });

  it('are declared once: every entry has one owner, and the three navigations together are the whole of it', () => {
    expect(items.length).toBe(13);
    expect(new Set(items.map((i) => i.href)).size).toBe(13);
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
    expect(workspaceOf('/operations-tickets')).toBe('engineering');
    expect(workspaceOf('/health/')).toBe('engineering');
    expect(workspaceOf('/system/patterns/rail')).toBe('main');
    expect(workspaceOf('/system/start/start-a-dashboard')).toBe('main');
  });

  it('is nobody\'s when no entry owns the path: a lookalike is not a detail', () => {
    expect(workspaceOf('/requests-archive')).toBeNull();
    expect(workspaceOf('/health-check')).toBeNull();
    expect(workspaceOf('/nowhere')).toBeNull();
    expect(workspaceOf('/sign-in')).toBeNull();
  });

  it('is read from the address and kept nowhere', () => {
    // The file as code: what its comments say is not what it does.
    const code = fs.readFileSync(path.join(ROOT, 'src/views/workspaces.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/cookie|localStorage|sessionStorage|searchParams|useState/i);
  });
});
