// @vitest-environment node
// Named cli-* so the payload leaves it out: it copies the template's own scripts.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-brand-atlas-'));
for (const d of ['scripts', 'src', 'tokens', 'app']) fs.cpSync(path.join(ROOT, d), path.join(dir, d), { recursive: true });
for (const f of ['package.json', 'next.config.ts']) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('brand.ts --no-atlas', () => {
  it('takes the Atlas routes out of the verification config with the routes themselves', () => {
    expect(fs.readFileSync(path.join(dir, 'scripts/verify.config.ts'), 'utf8')).toMatch(/path: '\/system/);
    execFileSync(process.execPath, ['scripts/brand.ts', '--no-atlas'], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
    expect(fs.existsSync(path.join(dir, 'app/system'))).toBe(false);
    const config = fs.readFileSync(path.join(dir, 'scripts/verify.config.ts'), 'utf8');
    expect(config).not.toMatch(/'\/system[/']/);
    expect(config).toMatch(/navigationChecks: \[/);
    expect(config).toMatch(/path: '\/requests'/);
  }, 120_000);
});
