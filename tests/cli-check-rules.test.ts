// @vitest-environment node
// Named cli-* so the payload leaves it out: it copies the template's own tracked files.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-rules-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
for (const f of execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((x) => x && !x.startsWith('cli/'))) {
  const src = path.join(ROOT, f);
  if (!fs.lstatSync(src, { throwIfNoEntry: false })?.isFile()) continue;
  fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
  fs.copyFileSync(src, path.join(dir, f));
}
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
const put = (f: string, text: string) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); };
const rogue = () => {
  put('src/views/rogue.tsx', "import { DEMO_NOW } from '@/system/fixtures/sample';\nimport { ALERTS } from '../system/fixtures/sample-ops';\nexport const rogue = [DEMO_NOW, ALERTS];\n");
  put('app/(dashboard)/rogue/page.tsx', "import { connection } from 'next/server';\nexport default async function Rogue() { await connection(); return null; }\n");
  put('app/(dashboard)/rogue/actions.ts', "'use server';\nimport { revalidateTag } from 'next/cache';\nexport async function stale() { revalidateTag('collection:x', 'max'); }\n");
};
const check = () => spawnSync(process.execPath, ['scripts/check.ts'], { cwd: dir, encoding: 'utf8' }).stdout;
/** The template's own `src/app.config.ts`, with the Overview item's need replaced (or dropped) to plant a nav case. */
const plantNav = (needs: string | null) => {
  const base = fs.readFileSync(path.join(ROOT, 'src/app.config.ts'), 'utf8');
  const at = 'needs: FEATURES.overview.needs';
  put('src/app.config.ts', needs === null ? base.replace(`, ${at}`, '') : base.replace(at, `needs: ${needs}`));
};
const restoreAppConfig = () => put('src/app.config.ts', fs.readFileSync(path.join(ROOT, 'src/app.config.ts'), 'utf8'));

describe("the template's own rules", () => {
  it('pass on the template as it is', () => expect(check()).toMatch(/^0 problems/m), 60_000);
  it('catch a direct fixture import, by alias and by relative path, a stray connection() and a stale writer', () => {
    rogue();
    const out = check();
    expect(out).toMatch(/src\/views\/rogue\.tsx:1: .*src\/system\/fixtures/);
    expect(out).toMatch(/src\/views\/rogue\.tsx:2: .*src\/system\/fixtures/);
    expect(out).toMatch(/app\/\(dashboard\)\/rogue\/page\.tsx:\d+: connection\(\)/);
    expect(out).toMatch(/app\/\(dashboard\)\/rogue\/actions\.ts:\d+: revalidates with 'max' on a writer path/);
  }, 60_000);
  it('allow one protagonist a page, in the template and in a product', () => {
    const featured = "<FeaturedMetric kicker=\"A\" value={1} />";
    put('src/views/two.tsx', `import { FeaturedMetric } from '@/components/patterns/featured-metric';\nexport const Two = () => (\n  <>\n    ${featured}\n    ${featured}\n  </>\n);\n`);
    expect(check()).toMatch(/src\/views\/two\.tsx:5: a second FeaturedMetric \(the first is at line 4\)/);
    fs.rmSync(path.join(dir, 'src/views/two.tsx'));
  }, 60_000);
  it('send a nav item with no need, a bad grant or an allOf the shape it cannot read to the gate, naming its href', () => {
    plantNav(null);
    expect(check()).toMatch(/src\/app\.config\.ts: nav item \/ has no needs/);
    plantNav("'keys:manage'");
    expect(check()).toMatch(/src\/app\.config\.ts: nav item \/ names "keys:manage", which is not a grant/);
    plantNav('{ allOf: [] }');
    expect(check()).toMatch(/src\/app\.config\.ts: nav item \/ has an empty allOf/);
    plantNav("{ allOf: [{ allOf: ['keys:read'] }] }");
    expect(check()).toMatch(/src\/app\.config\.ts: nav item \/ names \{"allOf":\["keys:read"\]\} in its allOf, which is not a grant/);
    // Not one of the template's alone: a product's own src/app.config.ts is checked too.
    put('.meridian/manifest.json', JSON.stringify({ version: '0.5.0', route: 'create', brand: { name: 'Acme' }, files: {} }));
    expect(check()).toMatch(/src\/app\.config\.ts: nav item \/ names \{"allOf":\["keys:read"\]\} in its allOf/);
    fs.rmSync(path.join(dir, '.meridian/manifest.json'));
    restoreAppConfig();
    expect(check()).not.toMatch(/src\/app\.config\.ts: nav item/);
  }, 60_000);
  it('stay out of a product, whose pages are its own', () => {
    rogue();
    expect(check()).toMatch(/reads src\/system\/fixtures directly/);
    put('.meridian/manifest.json', JSON.stringify({ version: '0.5.0', route: 'create', brand: { name: 'Acme' }, files: {} }));
    const out = check();
    expect(out).toMatch(/problems ·/);
    expect(out).not.toMatch(/reads src\/system\/fixtures directly|connection\(\) outside the template|revalidates with 'max'/);
  }, 60_000);
});
