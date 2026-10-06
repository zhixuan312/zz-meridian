// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-brand-literal-'));
for (const d of ['scripts', 'src', 'tokens']) fs.cpSync(path.join(ROOT, d), path.join(dir, d), { recursive: true });
fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'adopter', version: '2.3.1', description: 'Our own description.' }, null, 2) + '\n');
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
const brand = (...a: string[]) => execFileSync(process.execPath, ['scripts/brand.ts', ...a], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
const read = (p: string) => fs.readFileSync(path.join(dir, p), 'utf8');

describe('scripts/brand.ts values', () => {
  it('writes replacement patterns such as $& and $1 literally', () => {
    brand('--existing', '--name', 'Cash $& Co', '--workspace', 'R$1 Pay', '--user', 'A $$ B', '--role', "$` Admin");
    const cfg = read('src/app.config.ts');
    expect(cfg).toContain("name: 'Cash $& Co'");
    expect(cfg).toContain("workspace: 'R$1 Pay'");
    expect(cfg).toContain("user: { name: 'A $$ B', role: '$` Admin' }");
  }, 120_000);
  it('with --existing, --package renames the package only', () => {
    brand('--existing', '--package', 'renamed');
    const p = JSON.parse(read('package.json'));
    expect(p).toEqual({ name: 'renamed', version: '2.3.1', description: 'Our own description.' });
  }, 120_000);
});
