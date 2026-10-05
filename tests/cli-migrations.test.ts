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
