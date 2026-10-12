// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { RELEASE_MIGRATIONS } from '../cli/src/migrations.ts';

const tmp: string[] = [];
afterAll(() => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });
const project = (files: Record<string, string>) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-mig-'));
  tmp.push(root);
  for (const [p, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), c); }
  return root;
};
const byId = (id: string) => {
  const m = RELEASE_MIGRATIONS.find((x) => x.id === id);
  if (!m) throw new Error(`no migration ${id}`);
  return m;
};

const OLD = {
  'app/(dashboard)/layout.tsx': "import { AppShell } from '@/components/base/shell';\nexport default async function L({ children }) { const assistant = true; return <AppShell rail={null} assistant={assistant}>{children}</AppShell>; }\n",
  'src/views/settings.tsx': "const available = useAssistantAvailable();\nif (!available) return null;\n",
  'src/views/health.tsx': "<Freshness updatedAt={at} />\nformatRelative(at)\n",
  'next.config.ts': 'export default { reactStrictMode: true };\n',
  'app/(dashboard)/members/page.tsx': "await connection();\nconst { rows } = await members.query({});\n",
  'app/(dashboard)/members/actions.ts': "'use server';\nexport async function add() { await members.create!({}); }\n",
  'src/data/collections.ts': 'export const members = {};\n',
  'app/api/assistant/route.ts': 'export async function POST() { return new Response(null); }\n',
};
const NEW = {
  'app/(dashboard)/layout.tsx': "import { AppShell } from '@/components/base/shell';\nimport { LiveProvider } from '@/lib/live';\nexport default function L({ children }) { const assistant = connection().then(() => true); return <AppShell rail={null} assistant={assistant}><LiveProvider refresh={refreshCollections} scopeKey=\"demo/owner\">{children}</LiveProvider></AppShell>; }\n",
  'src/views/settings.tsx': 'const available = use(useAssistantAvailable());\n',
  'src/views/health.tsx': '<Freshness updatedAt={at} now={observedAt} />\nformatRelative(at, observedAt)\n',
  'next.config.ts': 'export default { cacheComponents: true, partialPrefetching: true };\n',
  'app/(dashboard)/members/page.tsx': "const { rows, observedAt } = await read('members');\n",
  'app/(dashboard)/members/actions.ts': "'use server';\nexport async function add() { const scope = await resolveAccess(); await collectionFor(scope, 'members').create!({}); updateTag(collectionTag(scope.tenantId, 'members')); }\n",
  'src/data/collections.ts': 'export const members = {};\n',
  'src/data/live-actions.ts': "'use server';\nexport async function refreshCollections() {}\n",
  'app/api/assistant/route.ts': 'export async function POST() { const scope = await resolveAccess(); return new Response(null); }\n',
};
const IDS = ['shell-assistant-promise', 'assistant-available-promise', 'clock-now-required', 'cache-components-config', 'connection-boundaries', 'authorized-read', 'scoped-invalidation', 'live-provider', 'authorized-endpoints'];

describe("this release's migrations", () => {
  it('are all declared for 0.5.0', () => {
    for (const id of IDS) expect(byId(id).since, id).toBe('0.5.0');
  });
  it('apply to a project on the old shapes, naming the files', () => {
    const root = project(OLD);
    for (const id of IDS) {
      const paths = byId(id).applies(root);
      expect(paths, id).not.toBeNull();
      expect(paths!.length, id).toBeGreaterThan(0);
    }
  });
  it('do not apply once the project is on the new shapes', () => {
    const root = project(NEW);
    for (const id of IDS) expect(byId(id).applies(root), id).toBeNull();
  });
  it('do not apply to a project without the files they concern', () => {
    const root = project({ 'package.json': '{}' });
    for (const id of IDS.filter((i) => i !== 'cache-components-config')) expect(byId(id).applies(root), id).toBeNull();
  });
});

describe('the 0.9.0 migrations', () => {
  it('find a view that shares a sentence and an object, and a page README with no "What the agent reads"', () => {
    const old = project({
      'app/embed/overview/view.tsx': "useShareView(`Overview: ${n} requests`, { view: 'overview', period });\n",
      'app/(dashboard)/orders/README.md': '# Orders\n\nThe orders.\n\n## Agents\n\nNot applicable.\n',
    });
    expect(byId('share-view-context').applies(old)).toEqual(['app/embed/overview/view.tsx']);
    expect(byId('agent-reads-section').applies(old)).toEqual(['app/(dashboard)/orders/README.md']);
    const current = project({
      'app/embed/overview/view.tsx': 'useShareView(overviewContext(data, index));\n',
      'app/(dashboard)/orders/README.md': '# Orders\n\nThe orders.\n\n## Agents\n\nThe page shares its context.\n\n### What the agent reads\n\nEvery order.\n',
    });
    expect(byId('share-view-context').applies(current)).toBeNull();
    expect(byId('agent-reads-section').applies(current)).toBeNull();
  });
});

describe('the 0.10.0 migration', () => {
  it('finds an assistant whose route-side code predates view tools, and leaves a current one alone', () => {
    const old = project({ 'app/api/assistant/route.ts': 'respond({ collections });\n', 'src/lib/assistant/tools.ts': 'export function assistantTools(collections, writer, guard) {}\n', 'src/lib/assistant/respond.ts': 'export async function respond() {}\n' });
    expect(byId('assistant-view-tools').applies(old)).toEqual(['src/lib/assistant/tools.ts', 'src/lib/assistant/respond.ts', 'app/api/assistant/route.ts']);
    const current = project({ 'app/api/assistant/route.ts': 'respond({ collections, views: viewTools });\n', 'src/lib/assistant/tools.ts': "import type { ViewTool } from '@/lib/shared-context';\n", 'src/lib/assistant/respond.ts': 'function limitsOf() {}\n' });
    expect(byId('assistant-view-tools').applies(current)).toBeNull();
    expect(byId('assistant-view-tools').applies(project({ 'app/page.tsx': 'x' }))).toBeNull();
  });
});

describe('the 0.13.0 migration', () => {
  it('finds a nav item with no need, and leaves a nav whose every item has one alone', () => {
    const old = project({
      'src/app.config.ts': "import { LayoutGrid } from 'lucide-react';\n\nexport const nav: NavItem[] = [\n  { href: '/', label: 'Overview', icon: LayoutGrid },\n  { href: '/requests', label: 'Requests', icon: LayoutGrid, needs: 'requests:read' },\n];\n",
    });
    expect(byId('nav-needs').applies(old)).toEqual(['src/app.config.ts']);
    // One item without one is the whole change: the rail asks each destination's need, and a missing one is a type error.
    const current = project({
      'src/app.config.ts': "import { LayoutGrid } from 'lucide-react';\n\nexport const nav: NavItem[] = [\n  { href: '/', label: 'Overview', icon: LayoutGrid, needs: 'public' },\n  { href: '/requests', label: 'Requests', icon: LayoutGrid, needs: FEATURES.requests.needs },\n];\n",
    });
    expect(byId('nav-needs').applies(current)).toBeNull();
    // The shape every project's `src/app.config.ts` actually has: groups, each opening on a line of its own. A group is
    // not a destination and has no `needs` to carry, so a nav whose every *item* has one is not this migration's.
    const grouped = project({
      'src/app.config.ts': "export const nav: NavGroup[] = [\n  {\n    items: [\n      { href: '/', label: 'Overview', icon: LayoutGrid, needs: 'public' },\n      { href: '/keys', label: 'API keys', icon: KeyRound, needs: 'keys:read' },\n    ],\n  },\n  {\n    label: 'Workspace',\n    items: [\n      { href: '/settings', label: 'Settings', icon: Settings, needs: 'public' },\n    ],\n  },\n];\n",
    });
    expect(byId('nav-needs').applies(grouped)).toBeNull();
    // ...and one item without a need inside a group is still the change: the group's own line is not what is read.
    const groupedOld = project({
      'src/app.config.ts': "export const nav: NavGroup[] = [\n  {\n    items: [\n      { href: '/', label: 'Overview', icon: LayoutGrid },\n    ],\n  },\n];\n",
    });
    expect(byId('nav-needs').applies(groupedOld)).toEqual(['src/app.config.ts']);
    // No nav at all, and no app.config.ts at all: nothing of the team's to change.
    expect(byId('nav-needs').applies(project({ 'src/app.config.ts': "export const brand = {};\n" }))).toBeNull();
    expect(byId('nav-needs').applies(project({ 'package.json': '{}' }))).toBeNull();
  });
});

describe('the 0.15.0 migration', () => {
  // The gate's rule followed a folder named (dashboard); 0.15.0 follows whatever route group the project keeps, so an
  // adopted project with its own group meets the rule for the first time and is told so before its gate fails.
  it('finds a page README under the project\'s own route group with no "What the agent reads"', () => {
    const old = project({
      'app/(dash)/teams/README.md': '# Teams\n\nThe teams.\n\n## Agents\n\nNot applicable.\n',
      'app/(dash)/people/README.md': '# People\n\nThe people.\n\n## Agents\n\nShared.\n\n### What the agent reads\n\nEvery person.\n',
      'app/sign-in/README.md': '# Sign in\n\nThe way in.\n',
    });
    expect(byId('agent-reads-own-group').since).toBe('0.15.0');
    expect(byId('agent-reads-own-group').applies(old)).toEqual(['app/(dash)/teams/README.md']);
  });

  it('leaves the template\'s own group to the rule that has covered it since 0.9.0, and finds nothing in a project on the new shape', () => {
    expect(byId('agent-reads-own-group').applies(project({ 'app/(dashboard)/orders/README.md': '# Orders\n\nThe orders.\n\n## Agents\n\nNot applicable.\n' }))).toBeNull();
    expect(byId('agent-reads-own-group').applies(project({ 'src/app/(console)/orders/README.md': '# Orders\n\nThe orders.\n\n## Agents\n\nShared.\n\n### What the agent reads\n\nEvery order.\n' }))).toBeNull();
    expect(byId('agent-reads-own-group').applies(project({ 'src/app/(console)/orders/README.md': '# Orders\n\nThe orders.\n' }))).toEqual(['src/app/(console)/orders/README.md']);
    expect(byId('agent-reads-own-group').applies(project({ 'package.json': '{}' }))).toBeNull();
  });
});
