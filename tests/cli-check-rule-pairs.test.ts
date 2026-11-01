// CLI-only executable preflight cases; the payload leaves tests/cli-* out.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { prefetchProblems } from '../scripts/lib/sizes.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * Navigate's rules that no fixture page can hold, because the failure is printed before Chrome starts from a config, a
 * flag or the project's own files, or comes out of a function the page has no part in. Each runs scripts/navigate.ts (or the
 * function) twice: once where the rule fails, once corrected. Chrome is pointed at nothing, so a run that gets past its
 * checks ends at `not run` with exit 0 (`full` mode: 1), and the corrected run is told by never printing the line.
 */
type Expect = { code: number; has: string; not?: string };
type Probe = { args: string[]; config: string; tree?: string; expect: Expect };
type Precheck = { line: string; fails: Probe; passes: Probe };

const EMPTY = 'export default {};';
const MAPPED = (path: string, title = 'A') => `export default { navigationChecks: [{ path: '${path}', title: '${title}', readySelector: 'main', probe: 'toggle', controlSelector: 'button', resultSelector: 'button' }] };`;
const RAIL = ['--rail', '/a,/b'];
const NOT_RUN = 'not run';

const PRECHECKS: Precheck[] = [
  { line: '--homes: bad is not <home>=<workspace>',
    fails: { args: [...RAIL, '--homes', 'bad', '--routes', '/a'], config: EMPTY, expect: { code: 1, has: '--homes: bad is not <home>=<workspace>' } },
    passes: { args: [...RAIL, '--homes', '/a=Main', '--routes', '/a'], config: EMPTY, expect: { code: 0, has: NOT_RUN } } },
  { line: 'smokeRoutes: /zzz is not one of the rail routes',
    fails: { args: RAIL, config: 'export default { smokeRoutes: ["/zzz"] };', expect: { code: 1, has: 'smokeRoutes: /zzz is not one of the rail routes' } },
    passes: { args: RAIL, config: 'export default { smokeRoutes: ["/a"] };', expect: { code: 0, has: NOT_RUN } } },
  { line: 'src/app.config.ts has no `nav` array of groups',
    fails: { args: ['--mode', 'full', '--routes', '/a'], config: MAPPED('/a'), tree: 'export const nav = 5;', expect: { code: 1, has: 'FAIL    navigate: src/app.config.ts has no `nav` array of groups' } },
    passes: { args: ['--routes', '/a'], config: MAPPED('/a'), tree: "export const nav = [{ items: [{ href: '/a' }, { href: '/b' }] }];", expect: { code: 0, has: NOT_RUN } } },
  { line: '/a: no navigation check is configured',
    fails: { args: [...RAIL, '--mode', 'full', '--routes', '/a'], config: EMPTY, expect: { code: 1, has: 'FAIL    /a: no navigation check is configured' } },
    passes: { args: [...RAIL, '--routes', '/a'], config: EMPTY, expect: { code: 0, has: 'warn    /a: no navigation check is configured', not: 'FAIL' } } },
  { line: 'navigation check has an empty title',
    fails: { args: [...RAIL, '--routes', '/a'], config: MAPPED('/a', ''), expect: { code: 1, has: 'FAIL    /a: navigation check has an empty title' } },
    passes: { args: [...RAIL, '--routes', '/a'], config: MAPPED('/a'), expect: { code: 0, has: NOT_RUN, not: 'FAIL' } } },
  { line: 'Chrome could not start',
    fails: { args: [...RAIL, '--mode', 'full', '--routes', '/a'], config: MAPPED('/a'), expect: { code: 1, has: 'Chrome could not start' } },
    passes: { args: [...RAIL, '--routes', '/a'], config: MAPPED('/a'), expect: { code: 0, has: NOT_RUN, not: 'FAIL' } } },
];

/** Runs scripts/navigate.ts in a scratch directory: the project's own scripts, with `tree` as src/app.config.ts when it names one. */
function navigateRun(probe: Probe): { code: number | null; out: string } {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-navigate-')));
  try {
    fs.writeFileSync(path.join(dir, 'config.ts'), probe.config);
    let script = path.join(ROOT, 'scripts/navigate.ts');
    let cwd = ROOT;
    if (probe.tree !== undefined) {
      // railRoutes reads src/app.config.ts beside the scripts: a copy of them beside a src of its own.
      fs.cpSync(path.join(ROOT, 'scripts'), path.join(dir, 'scripts'), { recursive: true, filter: (from) => !from.includes('fixtures') });
      fs.mkdirSync(path.join(dir, 'src'));
      fs.writeFileSync(path.join(dir, 'src/app.config.ts'), probe.tree);
      fs.writeFileSync(path.join(dir, 'package.json'), '{ "type": "module" }');
      fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
      script = path.join(dir, 'scripts/navigate.ts');
      cwd = dir;
    }
    const r = spawnSync(process.execPath, [script, '--config', path.join(dir, 'config.ts'), ...probe.args], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, CHROME: path.join(dir, 'no-chrome') } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('navigate: every rule printed before Chrome starts fails where it should and passes corrected', () => {
  for (const c of PRECHECKS) {
    it(`"${c.line}"`, () => {
      for (const [which, probe] of [['fails', c.fails], ['passes', c.passes]] as const) {
        const r = navigateRun(probe);
        expect(r.code, `${which}: ${r.out}`).toBe(probe.expect.code);
        expect(r.out, `${which}`).toContain(probe.expect.has);
        if (probe.expect.not) expect(r.out, `${which}`).not.toContain(probe.expect.not);
      }
    });
  }

  // The caps are judged by prefetchProblems and printed by navigate; the fixtures' landing page is the same for every case, so no page can hold one.
  const CAPS = { desktop: 80, phoneClosed: 0 };
  it('prefetch over its cap', () => {
    expect(prefetchProblems({ desktopBytes: 81 * 1024, phoneClosedBytes: 1 }, CAPS)).toEqual(['desktop: prefetch 81 KiB over its 80 KiB cap', 'phone with the drawer closed: prefetch 0 KiB over its 0 KiB cap']);
    expect(prefetchProblems({ desktopBytes: 80 * 1024, phoneClosedBytes: 0 }, CAPS)).toEqual([]);
  });
});

