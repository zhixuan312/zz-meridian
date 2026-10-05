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
const check = () => spawnSync(process.execPath, ['scripts/check.ts'], { cwd: dir, encoding: 'utf8' }).stdout;

describe("the template's own rules", () => {
  it('pass on the template as it is', () => expect(check()).toMatch(/^0 problems/m), 60_000);
  it('catch a direct fixture import, by alias and by relative path, a stray connection() and a stale writer', () => {
    put('src/views/rogue.tsx', "import { DEMO_NOW } from '@/system/fixtures/sample';\nimport { ALERTS } from '../system/fixtures/sample-ops';\nexport const rogue = [DEMO_NOW, ALERTS];\n");
    put('app/(dashboard)/rogue/page.tsx', "import { connection } from 'next/server';\nexport default async function Rogue() { await connection(); return null; }\n");
    put('app/(dashboard)/rogue/actions.ts', "'use server';\nimport { revalidateTag } from 'next/cache';\nexport async function stale() { revalidateTag('collection:x', 'max'); }\n");
    const out = check();
    expect(out).toMatch(/src\/views\/rogue\.tsx:1: .*src\/system\/fixtures/);
    expect(out).toMatch(/src\/views\/rogue\.tsx:2: .*src\/system\/fixtures/);
    expect(out).toMatch(/app\/\(dashboard\)\/rogue\/page\.tsx:\d+: connection\(\)/);
    expect(out).toMatch(/app\/\(dashboard\)\/rogue\/actions\.ts:\d+: revalidates with 'max' on a writer path/);
  }, 60_000);
  it('stay out of a product, whose pages are its own', () => {
    put('.meridian/manifest.json', JSON.stringify({ version: '0.5.0', route: 'create', brand: { name: 'Acme' }, files: {} }));
    const out = check();
    expect(out).toMatch(/problems ·/);
    expect(out).not.toMatch(/reads src\/system\/fixtures directly|connection\(\) outside the template|revalidates with 'max'/);
  }, 60_000);
});
