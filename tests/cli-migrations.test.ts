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
