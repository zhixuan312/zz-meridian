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
