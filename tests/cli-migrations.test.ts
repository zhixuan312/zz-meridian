// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readPayload } from '../cli/src/files.ts';
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
  'src/views/services.tsx': "<Freshness updatedAt={at} />\nformatRelative(at)\n",
  'next.config.ts': 'export default { reactStrictMode: true };\n',
  'app/(dashboard)/members/page.tsx': "await connection();\nconst { rows } = await members.query({});\n",
  'app/(dashboard)/members/actions.ts': "'use server';\nexport async function add() { await members.create!({}); }\n",
  'src/data/collections.ts': 'export const members = {};\n',
  'app/api/assistant/route.ts': 'export async function POST() { return new Response(null); }\n',
};
const NEW = {
  'app/(dashboard)/layout.tsx': "import { AppShell } from '@/components/base/shell';\nimport { LiveProvider } from '@/lib/live';\nexport default function L({ children }) { const assistant = connection().then(() => true); return <AppShell rail={null} assistant={assistant}><LiveProvider refresh={refreshCollections} scopeKey=\"demo/owner\">{children}</LiveProvider></AppShell>; }\n",
  'src/views/settings.tsx': 'const available = use(useAssistantAvailable());\n',
  'src/views/services.tsx': '<Freshness updatedAt={at} now={observedAt} />\nformatRelative(at, observedAt)\n',
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

  it('reads an item however many lines it is written over', () => {
    // A team that formats its editor's way: an item spread over its keys, with the `needs` two lines below its `href`.
    // Read by line, the `href` line carries no `needs` and the migration was reported for a file that has none of the
    // old shape left in it.
    const spread = project({
      'src/app.config.ts': "export const nav: NavGroup[] = [\n  {\n    items: [\n      {\n        href: '/',\n        label: 'Overview',\n        icon: LayoutGrid,\n        needs: 'public',\n      },\n      {\n        href: '/keys',\n        label: 'API keys',\n        icon: KeyRound,\n        needs: 'keys:read',\n      },\n    ],\n  },\n];\n",
    });
    expect(byId('nav-needs').applies(spread)).toBeNull();
    // And one spread item without a need is still the change.
    const spreadOld = project({
      'src/app.config.ts': "export const nav: NavGroup[] = [\n  {\n    items: [\n      {\n        href: '/',\n        label: 'Overview',\n        icon: LayoutGrid,\n      },\n    ],\n  },\n];\n",
    });
    expect(byId('nav-needs').applies(spreadOld)).toEqual(['src/app.config.ts']);
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

describe('the 0.16.0 migrations', () => {
  it('finds a configuration that does not say what a refused address draws, and leaves one that does alone', () => {
    expect(byId('refusal-declared').since).toBe('0.16.0');
    expect(byId('refusal-declared').applies(project({ 'src/app.config.ts': "export const app = { name: 'Rota' } as const;\n" }))).toEqual(['src/app.config.ts']);
    expect(byId('refusal-declared').applies(project({ 'src/app.config.ts': "export const refusal: 'explain' | 'absent' = 'explain';\n" }))).toBeNull();
    expect(byId('refusal-declared').applies(project({ 'package.json': '{}' }))).toBeNull();
  });

  it('are all declared for 0.16.0', () => {
    for (const id of ['managed-exports-removed', 'view-tool-page-explore', 'agent-does-here-section', 'sample-pages-renamed']) expect(byId(id).since, id).toBe('0.16.0');
  });

  // The sample's 0.15.0 names, spelled in parts: the repository holds the whole names out of everything but its history.
  const [O, A, H] = ['overview', 'analytics', 'health'];

  it('finds the files of the team that still import an export the release removed from a managed module', () => {
    // The lines a project created at 0.15.0 holds: the Overview context, the assistant's tools and a shipped test.
    const old = project({
      [`src/views/${O}-context.ts`]: "import { deviations, largest, runs, sameWeekdayBaseline, weekday, weekendRatio, median } from '@/lib/insight';\n",
      'src/lib/assistant/tools.ts': "import { patchOf, queryInput, writableFields, type AnyCollection } from '@/lib/collection';\n",
      'tests/shared-context.test.tsx': "import { deviations, median, runs, weekendRatio } from '@/lib/insight';\n",
      'src/views/trend.ts': "import * as insight from '../lib/insight';\nexport const r = insight.weekendRatio([], []);\n",
      'src/views/customers-context.ts': "import { median } from '@/lib/insight';\n",
      // A managed module is Meridian's and arrives with the update: it is never the team's to change.
      'src/lib/facts.ts': "import { largest } from '@/lib/insight';\n",
    });
    expect(byId('managed-exports-removed').applies(old)).toEqual(['src/lib/assistant/tools.ts', `src/views/${O}-context.ts`, 'src/views/trend.ts', 'tests/shared-context.test.tsx']);
    expect(byId('managed-exports-removed').applies(project({ 'src/views/home-context.ts': "import { median, sameWeekdayBaseline } from '@/lib/insight';\nimport { patchOf } from '@/lib/collection';\n" }))).toBeNull();
    expect(byId('managed-exports-removed').applies(project({ 'package.json': '{}' }))).toBeNull();
  });

  it('finds a view tool without the page it renders or its prepared query, and not a key inside its code', () => {
    // 0.15.0's shape: the keys of the object itself, where `page` also names a field of the input and of the data.
    const tool = (extra: string) => `export const requestsTool = defineViewTool({\n  name: 'requests',\n  description: 'The log, filtered {by status}.',\n  needs: FEATURES.requests.needs,\n${extra}  input: z.object({ page: z.number().optional() }),\n  async read(input) { const data = { page: 1, explore: null }; return { context: requestsContext(data), data }; },\n});\n`;
    expect(byId('view-tool-page-explore').applies(project({ 'src/views/tools.ts': tool('') }))).toEqual(['src/views/tools.ts']);
    expect(byId('view-tool-page-explore').applies(project({ 'src/views/tools.ts': tool("  page: '/requests',\n") }))).toEqual(['src/views/tools.ts']);
    expect(byId('view-tool-page-explore').applies(project({ 'src/views/tools.ts': tool("  page: '/requests',\n  explore: requestsExplore,\n") }))).toBeNull();
    // A definition of its own is not a call, and a project with no view tools has nothing to change.
    expect(byId('view-tool-page-explore').applies(project({ 'src/lib/views.ts': 'export function defineViewTool(t) { return t; }\n' }))).toBeNull();
    expect(byId('view-tool-page-explore').applies(project({ 'package.json': '{}' }))).toBeNull();
  });

  it("finds the specification of a view tool's page with no \"What the agent does here\"", () => {
    const tool = (name: string, page: string | null) => `defineViewTool({ name: '${name}', ${page === null ? '' : `page: '${page}', `}explore: q, read });\n`;
    const spec = (title: string, does: boolean) => `# ${title}\n\nThe ${title}.\n\n## Agents\n\nShared.\n\n### What the agent reads\n\nEvery row.\n${does ? '\n### What the agent does here\n\nProtagonist: Rows.\n' : ''}`;
    const specs = {
      'app/(dashboard)/requests/README.md': spec('Requests', false),
      'app/(dashboard)/customers/[id]/README.md': spec('One customer', true),
      'app/(dashboard)/settings/README.md': spec('Settings', false),
      'app/embed/requests/README.md': spec('Requests embed', false),
    };
    // With every tool naming its page, the gate's rule is exact: the pages named, never Settings or an embed view.
    const named = project({ ...specs, 'src/views/tools.ts': tool('requests', '/requests') + tool('customer', '/customers/[id]') });
    expect(byId('agent-does-here-section').applies(named)).toEqual(['app/(dashboard)/requests/README.md']);
    // A tool of 0.15.0 names no page, and the rule fires once it does: every console page without the part is listed.
    const unnamed = project({ ...specs, 'src/views/tools.ts': tool('requests', null) + tool('customer', '/customers/[id]') });
    expect(byId('agent-does-here-section').applies(unnamed)).toEqual(['app/(dashboard)/requests/README.md', 'app/(dashboard)/settings/README.md']);
    expect(byId('agent-does-here-section').applies(project({ ...specs, 'src/views/tools.ts': tool('customer', '/customers/[id]') }))).toBeNull();
    expect(byId('agent-does-here-section').applies(project(specs))).toBeNull();
    // A tool kept in a module of its own, which the registry imports, is read as the gate reads it since 0.17.0 (#43).
    const split = project({ ...specs, 'src/views/tools.ts': "export { requestsTool } from './requests-tool';\n", 'src/views/requests-tool.ts': tool('requests', '/requests') });
    expect(byId('agent-does-here-section').applies(split)).toEqual(['app/(dashboard)/requests/README.md']);
  });

  it("finds the sample's pages and views under their 0.15.0 names, and the files and tests that still read them", () => {
    const old = project({
      [`app/(dashboard)/(${O})/page.tsx`]: `import { OverviewView } from '@/views/${O}';\n`,
      [`app/(dashboard)/(${O})/loading.tsx`]: 'export default function Loading() { return null; }\n',
      [`app/(dashboard)/${A}/page.tsx`]: `import { gate } from '@/data/access';\nawait gate('${A}');\nimport { AnalyticsView } from '@/views/${A}';\n`,
      [`src/views/${O}-context.ts`]: 'export function context() {}\n',
      [`src/views/${A}.tsx`]: `import { analyticsFigures } from '@/data/${A}';\n`,
      [`src/data/${A}.ts`]: 'export function analyticsFigures() {}\n',
      'src/views/tools.ts': `import { ${O}Context } from './${O}-context';\nexport const t = { name: '${O}', needs: FEATURES.${O}.needs };\n`,
      'src/app.config.ts': `export const nav = [\n  { href: '/', label: 'Overview', needs: FEATURES.${O}.needs },\n];\n`,
      'tests/verify-sample-surfaces.test.ts': "import { sampleSurfaces } from '../scripts/lib/sample.ts';\nexpect(sampleSurfaces(root, 'app')).toEqual({ overview: true, members: true, keys: true, settings: true });\n",
      [`tests/workspace-${O}.test.tsx`]: `import { OverviewBody } from '@/views/${O}';\n`,
      'tests/fake.test.ts': `expect(names).toContain('view_${H}');\n`,
      'scripts/verify.config.ts': `const config = { navigationChecks: [\n    { path: '/${H}', title: 'Operations', readySelector: 'main' },\n  ] };\n`,
      // A product's own page at the same address is not the sample's, and neither is a test of the walk-through's new shape.
      [`app/(dashboard)/${H}/page.tsx`]: "import { StatusView } from '@/views/status';\n",
      'tests/members.test.ts': "import { sampleSurfaces } from '../scripts/lib/sample.ts';\nexpect(sampleSurfaces(root, 'app').members).toBe(true);\n",
    });
    expect(byId('sample-pages-renamed').applies(old)).toEqual([
      `app/(dashboard)/(${O})/loading.tsx`, `app/(dashboard)/(${O})/page.tsx`, `app/(dashboard)/${A}/page.tsx`,
      'src/app.config.ts', `src/data/${A}.ts`, `src/views/${A}.tsx`, `src/views/${O}-context.ts`, 'src/views/tools.ts',
      'tests/fake.test.ts', 'tests/verify-sample-surfaces.test.ts', `tests/workspace-${O}.test.tsx`,
      'scripts/verify.config.ts',
    ]);
    const current = project({
      'app/(dashboard)/(home)/page.tsx': "import { HomeView } from '@/views/home';\n",
      'src/views/home-context.ts': 'export function homeContext() {}\n',
      'src/app.config.ts': "export const nav = [\n  { href: '/', label: 'Home', needs: FEATURES.home.needs },\n];\n",
      'tests/verify-sample-surfaces.test.ts': "expect(sampleSurfaces(root, 'app')).toEqual({ home: true, now: true, members: true, keys: true, settings: true });\n",
      'scripts/verify.config.ts': "const config = { navigationChecks: [{ path: '/services', title: 'Services' }] };\n",
    });
    expect(byId('sample-pages-renamed').applies(current)).toBeNull();
    // The verify config alone names an address the product may own: without the sample's pages it is not this migration's.
    expect(byId('sample-pages-renamed').applies(project({ 'scripts/verify.config.ts': `const config = { navigationChecks: [{ path: '/${H}', title: 'Operations' }] };\n` }))).toBeNull();
    expect(byId('sample-pages-renamed').applies(project({ 'package.json': '{}' }))).toBeNull();
  });
});

describe('the 0.16.2 migration', () => {
  // The template's test of the rail as the releases before 0.16.2 wrote it: a fake observer pushing its callback and
  // answering `observe` with nothing, which held while the rail also read its own offsets.
  const railTest = (observe: string) => project({
    'tests/rail-marker.test.tsx': `import { Rail } from '@/components/patterns/rail';\nglobalThis.ResizeObserver = class { constructor(cb) { observers.push(cb); } ${observe} unobserve() {} disconnect() {} };\n`,
  });

  it('finds a test of the rail whose fake observer answers `observe` with nothing, and leaves one that answers it', () => {
    expect(byId('marker-measured-on-observe').since).toBe('0.16.2');
    expect(byId('marker-measured-on-observe').applies(railTest('observe() {}'))).toEqual(['tests/rail-marker.test.tsx']);
    // The release's own copy, and a `observe` that answers over more than one line, are what the migration leaves alone.
    expect(byId('marker-measured-on-observe').applies(railTest('observe() { for (const cb of observers) queueMicrotask(cb); }'))).toBeNull();
    expect(byId('marker-measured-on-observe').applies(railTest('observe() {\n      for (const cb of observers) queueMicrotask(cb);\n    }'))).toBeNull();
    // A test that mounts something else, and a project with no test of the rail, have nothing to bring over.
    expect(byId('marker-measured-on-observe').applies(project({ 'tests/shell.test.tsx': "import { Shell } from '@/components/base/shell';\nobserve() {}\n" }))).toBeNull();
    expect(byId('marker-measured-on-observe').applies(project({ 'package.json': '{}' }))).toBeNull();
  });
});

describe('the 0.16.3 migrations', () => {
  // The assistant route as the releases before 0.16.3 wrote it: its own `onPage`, which matched a catch-all as one segment.
  const old = "function onPage(route: string, path: string): boolean {\n  const want = route.split('/'), got = path.split('/');\n  return want.length === got.length;\n}\n";

  it('finds a route that matches the page with its own `onPage`, and leaves one that asks `viewAt`', () => {
    expect(byId('view-page-matched-as-next').since).toBe('0.16.3');
    expect(byId('view-page-matched-as-next').applies(project({ 'app/api/assistant/route.ts': old }))).toEqual(['app/api/assistant/route.ts']);
    expect(byId('view-page-matched-as-next').applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
    expect(byId('view-page-matched-as-next').applies(project({ 'package.json': '{}' }))).toBeNull();
  });

  it('finds a test that imports the journey from `scripts/navigate.ts`, and leaves one that imports it from its module', () => {
    expect(byId('journey-moved').since).toBe('0.16.3');
    expect(byId('journey-moved').applies(project({ 'tests/navigate-start.test.ts': "import { startFor } from '../scripts/navigate.ts';\n" }))).toEqual(['tests/navigate-start.test.ts']);
    expect(byId('journey-moved').applies(project({ 'tests/navigate-start.test.ts': "import { startFor } from '../scripts/lib/journey.ts';\n" }))).toBeNull();
    // `workspaceHomes` moved with the journey, so a file that imports it from the command is listed too.
    expect(byId('journey-moved').applies(project({ 'tests/homes.test.ts': "import { workspaceHomes } from '../scripts/navigate.ts';\n" }))).toEqual(['tests/homes.test.ts']);
    expect(byId('journey-moved').applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });

  it("finds a route or a read that cuts today at the UTC date, and leaves one that asks `dayOf`", () => {
    expect(byId('today-in-timezone').since).toBe('0.16.3');
    expect(byId('today-in-timezone').applies(project({
      'app/api/assistant/route.ts': "const io = { aggregate, read, today: clock().toISOString().slice(0, 10) };\n",
      'src/data/metrics.ts': "export async function readDays() {\n  const today = clock().toISOString().slice(0, 10);\n}\n",
    }))).toEqual(['app/api/assistant/route.ts', 'src/data/metrics.ts']);
    expect(byId('today-in-timezone').applies(project({ 'app/api/assistant/route.ts': 'const io = { aggregate, read, today: dayOf(clock()) };\n' }))).toBeNull();
    // A date stamped on a record elsewhere is not this migration's.
    expect(byId('today-in-timezone').applies(project({ 'app/keys/actions.ts': "const today = clock().toISOString().slice(0, 10);\n" }))).toBeNull();
    expect(byId('today-in-timezone').applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });
});

describe('the 0.17.0 migration', () => {
  it('finds a file that calls `finalOutcome` with a boolean, and leaves one that passes the tiers', () => {
    const imp = "import { finalOutcome } from '../scripts/lib/coverage.ts';\n";
    expect(byId('verify-tiers').since).toBe('0.17.0');
    expect(byId('verify-tiers').checks).toEqual(['gate']);
    expect(byId('verify-tiers').applies(project({ 'tests/verify-suite-outcome.test.ts': `${imp}finalOutcome(true, []);\n` }))).toEqual(['tests/verify-suite-outcome.test.ts']);
    expect(byId('verify-tiers').applies(project({ 'tests/verify-suite-outcome.test.ts': `${imp}finalOutcome({ full: true, timed: false }, []);\n` }))).toBeNull();
    // A call of another function by that name, with no import of the coverage module, is not this migration's.
    expect(byId('verify-tiers').applies(project({ 'tests/other.test.ts': 'finalOutcome(true, []);\n' }))).toBeNull();
    expect(byId('verify-tiers').applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });
});

describe('the 0.19.0 migration', () => {
  it('finds a test that expects a period with no data to draw a track, and leaves the release\'s own', () => {
    const imp = "import { ColumnChart } from '@/components/charts/column-chart';\n";
    expect(byId('no-data-mark').since).toBe('0.19.0');
    expect(byId('no-data-mark').applies(project({ 'tests/column-chart-no-data.test.tsx': `${imp}expect(none.querySelector('.bg-fill-track')).not.toBeNull();\n` }))).toEqual(['tests/column-chart-no-data.test.tsx']);
    expect(byId('no-data-mark').applies(project({ 'tests/column-chart-no-data.test.tsx': `${imp}expect(none.querySelector('.bg-fill-track')).toBeNull();\n` }))).toBeNull();
    // A test of another card that draws a track is not this migration's.
    expect(byId('no-data-mark').applies(project({ 'tests/heatmap.test.tsx': "import { Heatmap } from '@/components/charts/heatmap';\nexpect(cell.querySelector('.bg-fill-track')).not.toBeNull();\n" }))).toBeNull();
    expect(byId('no-data-mark').applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });
});

describe('the 0.26.0 migration', () => {
  it('finds a test that expects the 256px floor and a cell that spans columns, and leaves the release\'s own', () => {
    const imp = "import { Table, TableCell } from '@/components/ui/table';\n";
    expect(byId('table-grid').since).toBe('0.26.0');
    expect(byId('table-grid').applies(project({ 'tests/table-cut-cell.test.tsx': `${imp}expect(classes(heads[0])).toEqual(expect.arrayContaining(['min-w-40', '@min-[672px]:min-w-64']));\n` }))).toEqual(['tests/table-cut-cell.test.tsx']);
    expect(byId('table-grid').applies(project({ 'src/views/runs.tsx': `${imp}export const Empty = () => <TableCell colSpan={4}>No runs</TableCell>;\n` }))).toEqual(['src/views/runs.tsx']);
    expect(byId('table-grid').applies(project({ 'tests/table-cut-cell.test.tsx': `${imp}expect(classes(heads[0])).toEqual(expect.arrayContaining(['min-w-40']));\n` }))).toBeNull();
    // A span in a file that does not draw Meridian's table is not this migration's.
    expect(byId('table-grid').applies(project({ 'src/views/plain.tsx': 'export const Row = () => <td colSpan={2}>x</td>;\n' }))).toBeNull();
    expect(byId('table-grid').applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });
});

describe('the 0.28.0 migration', () => {
  it('finds a team file that names a moved module, or a symbol that left a shipped card', () => {
    const moved = byId('four-layers');
    expect(moved.since).toBe('0.28.0');
    // A module that left `src/views/` is reported from the path it left, under either alias or a relative specifier.
    expect(moved.applies(project({ 'src/views/own.tsx': "import { homeTool } from '@/views/tools';\nexport default homeTool;\n" }))).toEqual(['src/views/own.tsx']);
    expect(moved.applies(project({ 'src/views/own.tsx': "import { homeTool } from './tools';\nexport default homeTool;\n" }))).toEqual(['src/views/own.tsx']);
    // Two symbols left a shipped card for the logic layer. The card is Meridian's, so the update replaces it and a team
    // file that imported the symbol from it stops compiling: the migration has to name that as well as the paths.
    expect(moved.applies(project({ 'app/reports/page.tsx': "import { afterStart } from '@/components/patterns/incident-card';\nexport default afterStart;\n" }))).toEqual(['app/reports/page.tsx']);
    expect(moved.applies(project({ 'app/reports/page.tsx': "import { summarise } from '@/components/patterns/status-list';\nexport default summarise;\n" }))).toEqual(['app/reports/page.tsx']);
    // The card itself, and its type, are the card's own business: neither is a break.
    expect(moved.applies(project({ 'app/reports/page.tsx': "import { IncidentCard, type Incident } from '@/components/patterns/incident-card';\nexport default IncidentCard;\n" }))).toBeNull();
    expect(moved.applies(project({ 'app/reports/page.tsx': "import type { Service } from '@/components/patterns/status-list';\nexport default null;\n" }))).toBeNull();
    // A symbol is named through a namespace, or handed on by a re-export, as often as it is imported by name — and both
    // stop compiling once the card is replaced, so both are this migration's.
    expect(moved.applies(project({ 'app/reports/page.tsx': "import * as card from '@/components/patterns/incident-card';\nexport const at = card.afterStart('2026-01-01', '2026-01-02');\n" }))).toEqual(['app/reports/page.tsx']);
    expect(moved.applies(project({ 'src/views/own.tsx': "export { summarise } from '@/components/patterns/status-list';\n" }))).toEqual(['src/views/own.tsx']);
    expect(moved.applies(project({ 'src/views/own.tsx': "export * from '@/components/patterns/status-list';\n" }))).toEqual(['src/views/own.tsx']);
    // A namespace that names something the card still exports is not this migration's.
    expect(moved.applies(project({ 'app/reports/page.tsx': "import * as card from '@/components/patterns/incident-card';\nexport default card.IncidentCard;\n" }))).toBeNull();
    expect(moved.applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });
});

describe("the consumer smoke's record of the release migrations", () => {
  // `resolveAll` resolves only the ids `RELEASE_IDS` lists, with the edit `bringReleaseOver` makes for each: a release
  // migration missing from it is resolved as not applicable, and the origin it applies to fails at finalize.
  it('names every migration since 0.5.0', () => {
    const smoke = fs.readFileSync(path.resolve(import.meta.dirname, '../cli/scripts/smoke.ts'), 'utf8');
    const listed = /^const RELEASE_IDS = \[([^\]]*)\];$/m.exec(smoke)?.[1] ?? '';
    const ids = new Set([...listed.matchAll(/'([^']+)'/g)].map((m) => m[1]));
    // `verify-modes` alone is left out: its edit is a flag in a script, and no origin the smoke updates passes one.
    expect(RELEASE_MIGRATIONS.filter((m) => m.id !== 'verify-modes' && !ids.has(m.id)).map((m) => m.id)).toEqual([]);
  });
});

describe('the 0.30.0 migration', () => {
  it('finds a team file that reads a collection directly without stating why, and leaves the release’s own', () => {
    const call = "await members.query({ where: [{ field: 'id', op: 'eq', value: id }] });";
    expect(byId('direct-query-escape').since).toBe('0.30.0');
    expect(byId('direct-query-escape').applies(project({ 'app/(dashboard)/members/actions.ts': `'use server';\nconst m = ${call}\n` }))).toEqual(['app/(dashboard)/members/actions.ts']);
    // The escape the check prints, on the call's own line, is what the rule asks for — and the 0.30.0 release's own
    // five files carry it, so the repository is not this migration's.
    expect(byId('direct-query-escape').applies(project({ 'app/(dashboard)/members/actions.ts': `'use server';\nconst m = ${call} // allow-no-direct-query: read() cannot serve this — a server action reads the record it changes\n` }))).toBeNull();
    // A comment that quotes the call is not a call: the check blanks comments before it looks, and so does this.
    expect(byId('direct-query-escape').applies(project({ 'app/(dashboard)/members/page.tsx': `// the old page did ${call}\nexport default function P() { return null; }\n` }))).toBeNull();
    // The rule governs four folders, and a direct read outside them is not this migration's.
    expect(byId('direct-query-escape').applies(project({ 'src/data/collections.ts': `${call}\n` }))).toBeNull();
    expect(byId('direct-query-escape').applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });

  it('finds a configuration whose app object has no description, and leaves one that has', () => {
    const config = (body: string) => project({ 'src/app.config.ts': body });
    const app = (keys: string) => `import type { Need } from './lib/collection.ts';\n\nexport const app = {\n${keys}} as const;\n\nexport const nav: readonly NavItem[] = [];\n`;
    expect(byId('app-description').since).toBe('0.30.0');
    expect(byId('app-description').applies(config(app("  name: 'Smoke Ops',\n  workspace: 'Production',\n")))).toEqual(['src/app.config.ts']);
    expect(byId('app-description').applies(config(app("  name: 'Smoke Ops',\n  description: 'Traffic and health for every endpoint.',\n")))).toBeNull();
    // A config without an `app` object at all is something else's problem, and not a file to edit.
    expect(byId('app-description').applies(config("export const other = 1;\n"))).toBeNull();
    // A description outside the app object — a nav item's, a page's — does not stand in for the key.
    expect(byId('app-description').applies(config(app("  name: 'Smoke Ops',\n") + "\nconst item = { description: 'a rail entry' };\n"))).toEqual(['src/app.config.ts']);
    // A project with no configuration is not this migration's, and the release's own has the key.
    expect(byId('app-description').applies(project({}))).toBeNull();
    expect(byId('app-description').applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });
});

describe('the 0.31.1 migration', () => {
  it('finds a live stream starter that keeps its streams on a stop signal, and leaves the release\'s', () => {
    const starter = (body: string) => project({ 'src/data/live-stream.ts': body });
    expect(byId('live-stream-shutdown').since).toBe('0.31.1');
    expect(byId('live-stream-shutdown').applies(starter('export function liveStream(o) {\n  return new Response(null);\n}\n'))).toEqual(['src/data/live-stream.ts']);
    expect(byId('live-stream-shutdown').applies(starter('process.once(sig, function endLiveStreamsOnSignal() {});\nexport function liveStream(o) {}\n'))).toBeNull();
    // A project without the starter has no stream to end: the live reference adds it, and this has nothing to say.
    expect(byId('live-stream-shutdown').applies(project({}))).toBeNull();
    expect(byId('live-stream-shutdown').applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });
});

describe('the 0.32.0 migration', () => {
  it('finds a verify configuration with detail routes and no missing ones, and leaves the release\'s and an empty one', () => {
    const config = (body: string) => project({ 'scripts/verify.config.ts': body });
    expect(byId('missing-routes').since).toBe('0.32.0');
    expect(byId('missing-routes').applies(config("export default {\n  detailRoutes: [\n    '/requests/req_missing',\n  ],\n};\n"))).toEqual(['scripts/verify.config.ts']);
    expect(byId('missing-routes').applies(config("export default {\n  detailRoutes: ['/a'],\n  missingRoutes: ['/b'],\n};\n"))).toBeNull();
    // An adopted project lists none yet: nothing it lists can be a missing record.
    expect(byId('missing-routes').applies(config('export default {\n  detailRoutes: [],\n};\n'))).toBeNull();
    expect(byId('missing-routes').applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });
});

describe('the 0.34.0 migration', () => {
  it("finds a layout that hands Meridian's faces over from Google Fonts, and leaves a project's own fonts and the release's", () => {
    const layout = (body: string) => project({ 'app/layout.tsx': body });
    const google = "import { Geist, Geist_Mono } from 'next/font/google';\nconst sans = Geist({ subsets: ['latin'], variable: '--font-face-sans', display: 'swap' });\nconst mono = Geist_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-face-mono', display: 'swap' });\n";
    expect(byId('self-hosted-fonts').since).toBe('0.34.0');
    expect(byId('self-hosted-fonts').applies(layout(google))).toEqual(['app/layout.tsx']);
    // A create-next-app layout loads Geist for its own variables, which Meridian's tokens never read: the team's choice.
    expect(byId('self-hosted-fonts').applies(layout("import { Geist } from \"next/font/google\";\nconst geistSans = Geist({ variable: \"--font-geist-sans\", subsets: [\"latin\"] });\n"))).toBeNull();
    expect(byId('self-hosted-fonts').applies(layout("import localFont from 'next/font/local';\nconst sans = localFont({ src: '../src/styles/fonts/Geist-Variable.woff2', variable: '--font-face-sans' });\n"))).toBeNull();
    expect(byId('self-hosted-fonts').applies(project({}))).toBeNull();
    expect(byId('self-hosted-fonts').applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });
});

describe('the 0.36.0 navigation migration', () => {
  it("finds a NavItem type without the rail's under and prefetch fields, and leaves one that has both", () => {
    const m = byId('nav-item-fields');
    expect(m.since).toBe('0.36.0');
    const config = (fields: string) => project({ 'src/app.config.ts': `export type NavItem = { href: string; label: string; icon: LucideIcon; needs: Need${fields} };\nexport type NavGroup = { label?: string; items: NavItem[] };\n` });
    expect(m.applies(config(''))).toEqual(['src/app.config.ts']);
    expect(m.applies(config('; prefetch?: true'))).toEqual(['src/app.config.ts']);
    expect(m.applies(config('; under?: string'))).toEqual(['src/app.config.ts']);
    expect(m.applies(config('; prefetch?: true; under?: string'))).toBeNull();
    // A field of the same name elsewhere in the file does not stand in for the type's.
    expect(m.applies(project({ 'src/app.config.ts': 'export type NavItem = { href: string };\nconst item = { under: \'/\', prefetch: true };\n' }))).toEqual(['src/app.config.ts']);
    // A configuration with no NavItem type is not this migration's, and the release's own has both.
    expect(m.applies(project({ 'src/app.config.ts': 'export const app = {} as const;\n' }))).toBeNull();
    expect(m.applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });
});

describe('the 0.36.0 migration', () => {
  it("names a created project's sample files that differ from the release's and the sample modules it lacks, and nothing else", () => {
    const m = byId('sample-with-its-tests');
    expect(m.since).toBe('0.36.0');
    const created = (route: string, files: Record<string, string>) => project({ '.meridian/manifest.json': JSON.stringify({ route }), ...files });
    // One page as an older release wrote it, one as this release writes it, and the members page deleted with its folder.
    const files = { 'proxy.ts': 'export const config = {};\n', 'src/views/request.tsx': 'export const old = 1;\n', 'src/views/requests.tsx': readPayload('src/views/requests.tsx') };
    expect(m.applies(created('create', files))).toEqual(['proxy.ts', 'src/lib/totals.ts', 'src/views/request.tsx']);
    expect(m.applies(created('create', { 'src/views/requests.tsx': readPayload('src/views/requests.tsx'), 'src/lib/totals.ts': readPayload('src/lib/totals.ts') }))).toBeNull();
    // An adopted project holds no sample, and the template holds no manifest.
    expect(m.applies(created('adopt', files))).toBeNull();
    expect(m.applies(path.resolve(import.meta.dirname, '..'))).toBeNull();
  });
});
