// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-brand-'));
for (const d of ['scripts', 'src', 'tokens']) fs.cpSync(path.join(ROOT, d), path.join(dir, d), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
const brand = (...a: string[]) => execFileSync(process.execPath, ['scripts/brand.ts', ...a], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
const read = (p: string) => fs.readFileSync(path.join(dir, p), 'utf8');

describe('scripts/brand.ts', () => {
  it('adds a brand accent without patching preferences.ts', () => {
    const before = read('src/lib/preferences.ts');
    brand('--existing', '--hue', '25', '--chroma', '0.16');
    expect(read('src/lib/preferences.ts')).toBe(before);
    expect(read('src/app.config.ts')).toMatch(/accent: 'brand'/);
    expect(fs.existsSync(path.join(dir, 'tokens/accent.brand.tokens.json'))).toBe(true);
  }, 120_000);
  it('records the default theme once in the app config', () => {
    brand('--existing', '--theme', 'light');
    expect(read('src/app.config.ts')).toMatch(/\n {2}theme: 'light'/);
    brand('--existing', '--theme', 'dark');
    expect(read('src/app.config.ts').match(/\n {2}theme: '/g)).toHaveLength(1);
    expect(read('src/app.config.ts')).toMatch(/\n {2}theme: 'dark'/);
  }, 120_000);
  it('refuses any other theme', () => {
    const before = read('src/app.config.ts');
    const tokens = fs.readdirSync(path.join(dir, 'tokens')).sort();
    let stderr = '';
    try { brand('--existing', '--theme', 'blue'); } catch (e) { stderr = String((e as { stderr?: unknown }).stderr ?? ''); }
    expect(stderr).toMatch(/theme/i);
    expect(read('src/app.config.ts')).toBe(before);
    expect(fs.readdirSync(path.join(dir, 'tokens')).sort()).toEqual(tokens);
  });
});
