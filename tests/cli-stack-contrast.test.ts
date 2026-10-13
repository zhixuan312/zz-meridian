// @vitest-environment node
// Named cli-* so the payload leaves it out: it tests the contrast gate itself, which a created project runs as its own gate.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const resolver = JSON.parse(fs.readFileSync(path.join(ROOT, 'tokens/zz-meridian.resolver.json'), 'utf8'));
const themes = Object.keys(resolver.modifiers.theme.contexts);
const accents = Object.keys(resolver.modifiers.accent.contexts);
const WHAT = /the deepest part of a stack/;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-stack-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('the contrast gate and the part a stack stands on', () => {
  it('measures it in every theme and accent, and each holds 3:1 against the surface', () => {
    const out = execFileSync(process.execPath, ['scripts/contrast.ts', '--all'], { cwd: ROOT, encoding: 'utf8' });
    const lines = out.split('\n').filter((l) => WHAT.test(l));
    expect(lines).toHaveLength(themes.length * accents.length);
    for (const theme of themes) for (const accent of accents) {
      const line = lines.find((l) => new RegExp(`^ok\\s+${theme}\\s+${accent}\\s`).test(l));
      expect(line, `${theme} ${accent}`).toBeTruthy();
      expect(Number(line!.match(/([\d.]+):1 \(needs 3\)/)?.[1]), line).toBeGreaterThanOrEqual(3);
    }
    // Mixed in OKLab, as the browser mixes it: the same two colours mixed in sRGB would read 3.35.
    expect(lines.find((l) => /^ok\s+light\s+jade\s/.test(l))).toMatch(/ 3\.28:1 /);
  });

  it('fails when a theme mixes too little accent into it', () => {
    for (const d of ['scripts', 'tokens']) fs.cpSync(path.join(ROOT, d), path.join(dir, d), { recursive: true });
    fs.mkdirSync(path.join(dir, 'src/lib'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'src/lib/color.ts'), path.join(dir, 'src/lib/color.ts'));
    const file = path.join(dir, 'tokens/theme.light.tokens.json');
    const light = fs.readFileSync(file, 'utf8');
    const lowered = light.replace(/("chart-stack-hi":\s*\{\s*"\$type":\s*"number",\s*"\$value":\s*)[\d.]+/, (_, head: string) => `${head}0.5`);
    expect(lowered).not.toBe(light);
    fs.writeFileSync(file, lowered);
    const run = spawnSync(process.execPath, ['scripts/contrast.ts'], { cwd: dir, encoding: 'utf8' });
    expect(run.status).toBe(1);
    const failed = run.stdout.split('\n').filter((l) => l.startsWith('FAIL') && WHAT.test(l));
    expect(failed.length).toBeGreaterThan(0);
    for (const l of failed) expect(l).toMatch(/^FAIL light /);
    expect(run.stdout).toMatch(/contrast: \d+ pairs across every theme and accent, [1-9]\d* failures/);
  });
});
