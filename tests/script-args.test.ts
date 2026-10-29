// @vitest-environment node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPTS = ['audit', 'shot', 'vitals', 'keyboard', 'interactions', 'navigate', 'rail', 'perf', 'live', 'ask', 'assistant', 'sizes'];
// Nothing listens on port 9: a script that ignored the flag and started would fail on its first request, not run long.
const run = (script: string, ...args: string[]) =>
  spawnSync(process.execPath, [`scripts/${script}.ts`, ...args, '--base', 'http://127.0.0.1:9'], { cwd: ROOT, encoding: 'utf8', timeout: 20_000 });

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
  }
});
