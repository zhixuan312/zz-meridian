// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-brand-'));
for (const d of ['scripts', 'src', 'tokens']) fs.cpSync(path.join(ROOT, d), path.join(dir, d), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
const brand = (...a: string[]) => execFileSync(process.execPath, ['scripts/brand.ts', ...a], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
const read = (p: string) => fs.readFileSync(path.join(dir, p), 'utf8');
const config = () => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `import { app } from ${JSON.stringify(pathToFileURL(path.join(dir, 'src/app.config.ts')).href)}; console.log(JSON.stringify(app));`], { cwd: dir, encoding: 'utf8', stdio: 'pipe' }));

describe('scripts/brand.ts', () => {
  it('adds a brand accent without patching preferences.ts', () => {
    const before = read('src/lib/preferences.ts');
    brand('--existing', '--hue', '25', '--chroma', '0.16');
    expect(read('src/lib/preferences.ts')).toBe(before);
  }, 120_000);
  it('accepts a filename-safe custom accent name', () => {
    brand('--existing', '--hue', '25', '--accent-name', 'Brand_2-blue');
    expect(JSON.parse(read('tokens/accent.Brand_2-blue.tokens.json')).accent['accent-h'].$value).toBe(25);
    expect(config().accent).toBe('Brand_2-blue');
  }, 120_000);
  it.each(['/../../../../escaped', '../escape', 'a/b', "owner's", '.', ''])('rejects unsafe accent id %j before any write', (id) => {
    // Even the unfixed command can only escape into this test's own deep scratch parent.
    const owned = fs.mkdtempSync(path.join(dir, 'unsafe-accent-'));
    const deep = path.join(owned, 'a/b/c/project');
    fs.mkdirSync(deep, { recursive: true });
    for (const p of ['scripts/brand.ts', 'scripts/lib/args.ts', 'src/lib/color.ts', 'src/app.config.ts', 'package.json']) {
      fs.mkdirSync(path.dirname(path.join(deep, p)), { recursive: true });
      fs.copyFileSync(path.join(dir, p), path.join(deep, p));
    }
    fs.mkdirSync(path.join(deep, 'tokens'));
    const before = fs.readFileSync(path.join(deep, 'src/app.config.ts'), 'utf8');
    const packageBefore = fs.readFileSync(path.join(deep, 'package.json'), 'utf8');
    try {
      let stderr = '';
      try {
        execFileSync(process.execPath, ['scripts/brand.ts', '--name', 'Uncommitted name', '--hue', '25', '--accent-name', id], { cwd: deep, encoding: 'utf8', stdio: 'pipe' });
      } catch (e) {
        if (e && typeof e === 'object' && 'stderr' in e) stderr = String(e.stderr);
      }
      expect(stderr).toMatch(/--accent-name uses only/);
      expect(fs.readFileSync(path.join(deep, 'src/app.config.ts'), 'utf8')).toBe(before);
      expect(fs.readFileSync(path.join(deep, 'package.json'), 'utf8')).toBe(packageBefore);
      expect(fs.readdirSync(path.join(deep, 'tokens'))).toEqual([]);
      expect(fs.existsSync(path.join(owned, 'a/b/escaped.tokens.json'))).toBe(false);
    } finally {
      fs.rmSync(owned, { recursive: true, force: true });
    }
  });
  it('keeps the step that fixed a failing accent, and does not refuse it with the failure before it', () => {
    // #0E8A5F fails white on its dark fill at the start and passes one step darker; the command refused it with the
    // first step's failure, which no longer held.
    brand('--existing', '--hex', '#0E8A5F', '--accent-name', 'stepped');
    const t = JSON.parse(read('tokens/accent.stepped.tokens.json'));
    expect(t.$extensions['dev.zz.meridian'].overrides.dark['accent-l']).toBeLessThan(0.56);
    expect(execFileSync(process.execPath, ['scripts/contrast.ts'], { cwd: dir, encoding: 'utf8' })).not.toMatch(/FAIL.* stepped /);
  }, 120_000);
  it('refuses a brand it could not check, instead of reading a crashed contrast run as no failures', () => {
    // A contrast run that printed no summary did not measure anything. Its empty output used to look like "nothing
    // failed", and the command finished with the accent unchecked.
    const real = read('scripts/contrast.ts');
    fs.writeFileSync(path.join(dir, 'scripts/contrast.ts'), 'console.log("the palette did not load");\nprocess.exit(2);\n');
    let failed = false;
    let stderr = '';
    try { brand('--existing', '--hue', '200', '--chroma', '0.15', '--accent-name', 'unchecked'); } catch (e) {
      failed = true;
      stderr = String((e as { stderr?: unknown }).stderr ?? '');
    } finally {
      fs.writeFileSync(path.join(dir, 'scripts/contrast.ts'), real);
    }
    expect(failed).toBe(true);
    expect(stderr).toMatch(/did not run to its summary/);
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
  it('rebrands complete names and workspaces that already contain apostrophes', () => {
    const before = read('src/app.config.ts');
    try {
      brand('--existing', '--name', "Owner's Desk", '--workspace', "Team's Space");
      expect(config()).toMatchObject({ name: "Owner's Desk", workspace: "Team's Space" });
      brand('--existing', '--name', "O'Neil's New Desk", '--workspace', 'Updated space');
      expect(config()).toMatchObject({ name: "O'Neil's New Desk", workspace: 'Updated space' });
    } finally {
      fs.writeFileSync(path.join(dir, 'src/app.config.ts'), before);
    }
  }, 120_000);
  it('preserves an already quoted user or role when changing only the other', () => {
    const before = read('src/app.config.ts');
    try {
      brand('--existing', '--user', "Ada O'Neil", '--role', "Team's Owner");
      expect(config().user).toEqual({ name: "Ada O'Neil", role: "Team's Owner" });
      brand('--existing', '--role', "Reviewer's Admin");
      expect(config().user).toEqual({ name: "Ada O'Neil", role: "Reviewer's Admin" });
      brand('--existing', '--user', "Mia D'Angelo");
      expect(config().user).toEqual({ name: "Mia D'Angelo", role: "Reviewer's Admin" });
    } finally {
      fs.writeFileSync(path.join(dir, 'src/app.config.ts'), before);
    }
  }, 120_000);
  it('refuses a timezone the product cannot render without changing the current zone', () => {
    const before = read('src/app.config.ts');
    expect(() => brand('--existing', '--timezone', 'Not/AZone')).toThrow();
    expect(read('src/app.config.ts')).toBe(before);
  });
  it('refuses a preset and a colour together before writing either', () => {
    const configBefore = read('src/app.config.ts');
    const resolverBefore = read('tokens/zz-meridian.resolver.json');
    expect(() => brand('--existing', '--accent', 'jade', '--hex', '#E4572E')).toThrow(/one or the other/);
    expect(read('src/app.config.ts')).toBe(configBefore);
    expect(read('tokens/zz-meridian.resolver.json')).toBe(resolverBefore);
  }, 120_000);
  it('validates the timezone before applying other requested configuration changes', () => {
    const before = read('src/app.config.ts');
    try {
      expect(() => brand('--existing', '--name', 'Uncommitted name', '--workspace', 'Uncommitted workspace', '--timezone', 'Not/AZone')).toThrow();
      expect(read('src/app.config.ts')).toBe(before);
    } finally {
      fs.writeFileSync(path.join(dir, 'src/app.config.ts'), before);
    }
  });
  it.each(['--name', '--workspace', '--timezone', '--package', '--accent', '--theme', '--currency', '--user', '--role', '--hex', '--hue', '--chroma', '--accent-name'])('refuses missing %s values before applying another option', (flag) => {
    const before = read('src/app.config.ts');
    try {
      expect(() => brand('--existing', '--name', 'Uncommitted name', flag)).toThrow();
      expect(read('src/app.config.ts')).toBe(before);
    } finally {
      fs.writeFileSync(path.join(dir, 'src/app.config.ts'), before);
    }
  });
  it('rejects a following known flag instead of treating it as the product name', () => {
    const before = read('src/app.config.ts');
    try {
      expect(() => brand('--existing', '--name', '--theme', 'dark')).toThrow();
      expect(read('src/app.config.ts')).toBe(before);
    } finally {
      fs.writeFileSync(path.join(dir, 'src/app.config.ts'), before);
    }
  });
});
