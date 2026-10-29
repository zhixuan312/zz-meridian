// @vitest-environment node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPTS = ['audit', 'shot', 'vitals', 'keyboard', 'interactions', 'navigate', 'rail', 'perf', 'live', 'ask', 'assistant', 'sizes'];
// Nothing listens on port 9: a script that ignored the flag and started would fail on its first request, not run long.
const run = (script: string, ...args: string[]) =>
  spawnSync(process.execPath, [`scripts/${script}.ts`, ...args, '--base', 'http://127.0.0.1:9'], { cwd: ROOT, encoding: 'utf8', timeout: 20_000 });

/** Every flag the script reads, in its own source or in a module of scripts/ it loads: `--rate` is read in lib/phone.ts. */
function flagsRead(file: string, seen = new Set<string>()): Set<string> {
  const flags = new Set<string>();
  if (seen.has(file)) return flags;
  seen.add(file);
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(?:opt|arg|flag|includes|indexOf)\(\s*'(--[a-z][a-z-]*)'/g)) flags.add(m[1]!);
  for (const m of src.matchAll(/from '(\.{1,2}\/[^']+\.ts)'/g)) for (const f of flagsRead(path.resolve(path.dirname(file), m[1]!), seen)) flags.add(f);
  return flags;
}

/**
 * A check run by hand answers `--help` with the flags it reads, and refuses one it does not, before it opens a browser or
 * reads a page: `node scripts/audit.ts --help` used to start a twenty-minute audit of whatever answered the default address.
 */
describe('a script run by hand', () => {
  for (const script of SCRIPTS) {
    it(`${script} names its flags for --help and refuses one it does not read`, () => {
      const help = run(script, '--help');
      expect(help.status, help.stderr).toBe(0);
      expect(help.stdout).toMatch(new RegExp(`^${script} takes .*--base`));
      const typo = run(script, '--basee');
      expect(typo.status).toBe(1);
      expect(typo.stderr).toContain(`${script}: --basee is not an option.`);
    });

    it(`${script} takes every flag it reads`, () => {
      const read = [...flagsRead(path.join(ROOT, `scripts/${script}.ts`))].filter((f) => f !== '--help');
      expect(read).toContain('--base');
      const all = run(script, ...read, '--basee');
      expect(all.stderr).toContain(`${script}: --basee is not an option.`);
    });
  }
});

/**
 * brand.ts writes the project in place, so it is run from a copy that holds only what it loads: a refusal that did not
 * happen would fail there on the first file it reads, never brand this checkout.
 */
describe('brand run by hand', () => {
  const copy = () => {
    const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'meridian-brand-args-'));
    for (const rel of ['scripts/brand.ts', 'scripts/lib/args.ts', 'src/lib/color.ts']) {
      fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
      fs.copyFileSync(path.join(ROOT, rel), path.join(dir, rel));
    }
    return dir;
  };
  const brand = (dir: string, ...args: string[]) => spawnSync(process.execPath, ['scripts/brand.ts', ...args], { cwd: dir, encoding: 'utf8', timeout: 20_000 });

  it('refuses a mistyped flag before it brands anything, and takes every flag it reads', () => {
    const dir = copy();
    try {
      const typo = brand(dir, '--name', 'Acme', '--hu', '25');
      expect(typo.status).toBe(1);
      expect(typo.stderr).toContain('brand: --hu is not an option.');
      const read = [...flagsRead(path.join(ROOT, 'scripts/brand.ts'))].filter((f) => f !== '--help');
      expect(read).toContain('--hue');
      expect(brand(dir, ...read, '--basee').stderr).toContain('brand: --basee is not an option.');
      expect(brand(dir, '--help').stdout).toMatch(/^brand takes .*--name/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
