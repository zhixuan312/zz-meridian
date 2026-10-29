// Named cli-* so the payload leaves it out: it reads scripts/fixtures/deep/, which only Meridian's repository has.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { prefetchProblems } from '../scripts/lib/sizes.ts';

/**
 * Every rule a browser suite judges, and the two fixture pages that hold it: one the rule must fail, with the line it
 * prints, and one it must pass. A rule with only a page that passes is a rule nothing shows can fire, and a rule with
 * only a page that fails is one that might fire on everything; either kind reached adopters as a red on correct code or
 * a green on broken code (#23, #43, #52, #65, #66, #82, #86). The cases themselves run in tests/deep-checks.test.ts;
 * this holds that each rule has both, and that a message a suite can print belongs to a rule listed here.
 */
type Suite = 'audit' | 'presses' | 'keyboard' | 'vitals' | 'navigate' | 'navigate-timing-off' | 'navigate-timing-on';
type Rule = {
  /** The suite in scripts/fixtures/deep/expected.json. */
  suite: Suite;
  /** Text every line the rule prints carries, as the manifest's `line` holds it. */
  line: string;
  /** The page the rule fails, and the one it passes (a corrected twin, or the clean page where nothing else fits). */
  fails: string;
  passes: string;
  /** The suite the passing page is run in, when it is not the failing page's (a mapping that fails under one config and passes under another). */
  passesSuite?: Suite;
  /** The file `source` is in, when it is not the suite's script (navigate's journey is in scripts/lib/journey.ts). */
  file?: string;
  /** Text at the place in the suite's source the rule fails from: the place still exists, and no place goes unclaimed. */
  source: string;
};

const RULES: Rule[] = [
  // The audit, in the order scripts/audit.ts reports.
  { suite: 'audit', line: 'answered 404, so what was measured is its error page', fails: '/gone/record', passes: '/gone/record' , source: 'answerProblem(route' },
  { suite: 'audit', line: 'draws the not-found screen', fails: '/drawn-missing', passes: '/drawn-missing' , source: 'answerProblem(route' },
  { suite: 'audit', line: 'is in missingRoutes, and it answered 200', fails: '/came-to-exist', passes: '/gone/record' , source: 'answerProblem(route' },
  { suite: 'audit', line: 'the audit measured /moved-page-now while asking for /moved-page', fails: '/moved-page', passes: '/clean' , source: '`the audit measured ${here.pathname}' },
  { suite: 'audit', line: 'the address dropped view', fails: '/drops-query?view=all', passes: '/clean' , source: '`the address dropped ' },
  { suite: 'audit', line: 'the page holds 0 characters of text', fails: '/empty-region', passes: '/empty-region-fixed' , source: '`the page holds ' },
  { suite: 'audit', line: 'sideways: document', fails: '/sideways-document', passes: '/sideways-document-fixed' , source: 'out.sideways.push(\'document \'' },
  { suite: 'audit', line: 'sideways: scroll region', fails: '/sideways-region', passes: '/sideways-region-fixed' , source: 'out.sideways.push(\'scroll region \'' },
  { suite: 'audit', line: 'sideways: strip', fails: '/strip', passes: '/strip-fixed' , source: 'out.sideways.push(\'strip \'' },
  { suite: 'audit', line: 'sideways: data page', fails: '/sideways-data-page', passes: '/sideways-data-page-fixed' , source: 'out.sideways.push(\'data page \'' },
  { suite: 'audit', line: 'sideways: table', fails: '/sideways-table', passes: '/sideways-table-fixed' , source: 'out.sideways.push(\'table \'' },
  { suite: 'audit', line: 'clipped:', fails: '/deep-clipped', passes: '/deep-clipped-fixed' , source: 'out.clipped.push(' },
  { suite: 'audit', line: 'spills:', fails: '/spill', passes: '/spill-fixed' , source: 'out.spills.push(' },
  { suite: 'audit', line: 'truncated:', fails: '/truncated', passes: '/truncated-fixed' , source: 'out.truncated.push(' },
  { suite: 'audit', line: 'overlap:', fails: '/overlap-text', passes: '/overlap-none' , source: '\' are drawn in the same place\'' },
  { suite: 'audit', line: 'overlap: a line', fails: '/overlap-line', passes: '/overlap-none' , source: 'out.overlap.push(\'a line (\'' },
  { suite: 'audit', line: 'unnamed:', fails: '/deep-unnamed', passes: '/deep-unnamed-fixed' , source: 'out.unnamed.push(' },
  { suite: 'audit', line: 'unmeasured: x-sealed (no open shadow root)', fails: '/deep-closed', passes: '/deep-closed-fixed' , source: '\' (no open shadow root)\'' },
  { suite: 'audit', line: 'unmeasured: x-ghost (not defined)', fails: '/deep-undefined', passes: '/deep-undefined-fixed' , source: '\' (not defined)\'' },
  { suite: 'audit', line: 'heading skips a level', fails: '/heading-skip', passes: '/heading-skip-fixed' , source: 'out.headings.push(' },
  { suite: 'audit', line: 'touch target under 44px', fails: '/deep-target', passes: '/deep-target-fixed' , source: 'out.targets.push(' },
  { suite: 'audit', line: 'scrollers:', fails: '/double-scroller', passes: '/double-scroller-fixed' , source: 'out.scrollers.push(' },
  { suite: 'audit', line: 'contrast:', fails: '/deep-contrast', passes: '/deep-contrast-fixed' , source: 'out.contrast.push(' },
  { suite: 'audit', line: 'no focus ring:', fails: '/deep-ringless', passes: '/deep-ringless-fixed' , source: 'r.focusless.push(' },
  { suite: 'audit', line: 'exception:', fails: '/page-error', passes: '/clean' , source: '...[...new Set(page.errors)]' },
  { suite: 'audit', line: 'console.error:', fails: '/console-error', passes: '/clean' , source: '...[...new Set(page.errors)]' },
  { suite: 'audit', line: 'could not be measured:', fails: '/deep-hangs', passes: '/clean' , source: 'could not be measured: ${message}' },
  // The presses, in the order scripts/interactions.ts reports.
  { suite: 'presses', line: 'answered 404, so what was measured is its error page', fails: '/gone/record', passes: '/gone/record' , source: '${answer}' },
  { suite: 'presses', line: 'draws the not-found screen', fails: '/drawn-missing', passes: '/drawn-missing' , source: '${answer}' },
  { suite: 'presses', line: 'is in missingRoutes, and it answered 200', fails: '/came-to-exist', passes: '/gone/record' , source: '${answer}' },
  { suite: 'presses', line: 'is not a URL', fails: '/presses-bad-url', passes: '/presses-bad-url-fixed' , source: 'is not a URL' },
  { suite: 'presses', line: 'answers 404', fails: '/presses-relative-link', passes: '/presses-relative-link-fixed' , source: 'answers ${status}' },
  { suite: 'presses', line: 'was listed but could not be found again', fails: '/presses-control-gone', passes: '/presses-controls-move' , source: 'was listed but could not be found again' },
  { suite: 'presses', line: 'is covered by', fails: '/presses-covered', passes: '/presses-covered-fixed' , source: 'is covered by ${armed.covered}' },
  { suite: 'presses', line: 'does nothing when', fails: '/deep-dead-control', passes: '/deep-dead-control-fixed' , source: 'does nothing when' },
  { suite: 'presses', line: 'exception:', fails: '/page-error', passes: '/clean' , source: '${page.errors[0]}' },
  { suite: 'presses', line: 'could not be walked:', fails: '/hangs', passes: '/clean' , source: 'could not be walked:' },
  // The keyboard walk, in the order scripts/keyboard.ts reports.
  { suite: 'keyboard', line: 'answered 404, so what was measured is its error page', fails: '/gone/record', passes: '/gone/record' , source: 'problems.push(answer)' },
  { suite: 'keyboard', line: 'draws the not-found screen', fails: '/drawn-missing', passes: '/drawn-missing' , source: 'problems.push(answer)' },
  { suite: 'keyboard', line: 'is in missingRoutes, and it answered 200', fails: '/came-to-exist', passes: '/gone/record' , source: 'problems.push(answer)' },
  { suite: 'keyboard', line: 'no focus ring:', fails: '/deep-ringless', passes: '/deep-ringless-fixed' , source: '`no focus ring: ' },
  { suite: 'keyboard', line: 'hidden under', fails: '/keyboard-hidden', passes: '/keyboard-hidden-fixed' , source: '`hidden under ' },
  { suite: 'keyboard', line: 'reverse order differs', fails: '/keyboard-reverse', passes: '/keyboard-reverse-fixed' , source: '`reverse order differs' },
  { suite: 'keyboard', line: 'not Skip to content', fails: '/keyboard-skip-link', passes: '/keyboard-skip-link-fixed' , source: 'not Skip to content`' },
  { suite: 'keyboard', line: 'never reached:', fails: '/deep-shift-tab', passes: '/deep-shift-tab-fixed' , source: '`never reached: ' },
  { suite: 'keyboard', line: 'could not be found again:', fails: '/keyboard-control-gone', passes: '/keyboard-control-gone-fixed' , source: '`could not be found again: ' },
  { suite: 'keyboard', line: 'could not be walked:', fails: '/hangs', passes: '/clean' , source: 'could not be walked: ' },
  // The vitals' floors, in the order scripts/vitals.ts judges them.
  { suite: 'vitals', line: 'answered 404, so what was measured is its error page', fails: '/gone/record', passes: '/gone/record' , source: '!!m.answer' },
  { suite: 'vitals', line: 'draws the not-found screen', fails: '/drawn-missing', passes: '/drawn-missing' , source: '!!m.answer' },
  { suite: 'vitals', line: 'is in missingRoutes, and it answered 200', fails: '/came-to-exist', passes: '/gone/record' , source: '!!m.answer' },
  { suite: 'vitals', line: 'over the LCP floor', fails: '/vitals-late-paint', passes: '/vitals-late-paint-fixed' , source: '\'over the LCP floor' },
  { suite: 'vitals', line: 'over the INP floor', fails: '/vitals-slow-tap', passes: '/vitals-slow-tap-fixed' , source: '\'over the INP floor' },
  { suite: 'vitals', line: 'over the CLS floor', fails: '/deep-shifts', passes: '/vitals-shifts-fixed' , source: '\'over the CLS floor' },
  { suite: 'vitals', line: 'dropped a frame', fails: '/vitals-dropped-frame', passes: '/vitals-dropped-frame-fixed' , source: '\'dropped a frame' },
  // Navigate, in the order scripts/navigate.ts reports: what is wrong before Chrome starts (the rules paired by running it are in
  // PRECHECKS below), then each journey's start, its press, its shell, its data and its control, then its clock.
  { suite: 'navigate', line: '--timing must be on or off', fails: '/nav-home', passes: '/nav-home', source: '--timing must be on or off' },
  { suite: 'navigate', line: '--mode must be default or full', fails: '/nav-home', passes: '/nav-home', source: '--mode must be default or full' },
  { suite: 'navigate', line: '--samples: one sample and two retakes', fails: '/nav-home', passes: '/nav-home', source: '--samples: one sample' },
  { suite: 'navigate', line: 'not one of the rail routes (', fails: '/nav-not-in-rail', passes: '/nav-home', source: 'errors.forEach((e) => console.log(' },
  { suite: 'navigate', line: 'the rail has no other route to start from', fails: '/nav-d-nostart', passes: '/nav-home', source: 'the rail has no other route to start from' },
  { suite: 'navigate', line: 'never-ready: the starting page', fails: '/nav-d-unloaded', passes: '/nav-home', source: 'const reason = e instanceof Fail' },
  { suite: 'navigate', line: 'never-ready: the starting page', fails: '/nav-d-unloaded', passes: '/nav-home', source: 'verdict: \'fail\', reason }' },
  { suite: 'navigate', line: 'the starting page /nav-s-unloaded did not load in', fails: '/nav-d-unloaded', passes: '/nav-home', file: 'scripts/lib/journey.ts', source: 'did not load in ${PATIENCE' },
  { suite: 'navigate', line: 'the Open navigation button is not pressable on the phone', fails: '/nav-d-nobutton', passes: '/nav-home', file: 'scripts/lib/journey.ts', source: 'is not pressable on the phone' },
  { suite: 'navigate', line: 'the drawer did not show a link to', fails: '/nav-d-nolink', passes: '/nav-home', file: 'scripts/lib/journey.ts', source: 'the drawer did not show a' },
  { suite: 'navigate', line: 'the rail has no pressable link to', fails: '/nav-d-nolink', passes: '/nav-home', file: 'scripts/lib/journey.ts', source: 'the rail has no pressable' },
  { suite: 'navigate', line: 'the link to /nav-d-gone is covered or gone', fails: '/nav-d-gone', passes: '/nav-home', file: 'scripts/lib/journey.ts', source: 'the link to ${route} is covered or gone' },
  { suite: 'navigate', line: 'the workspace menu offers no item for Unoffered', fails: '/nav-solo-unoffered', passes: '/nav-solo', file: 'scripts/lib/journey.ts', source: 'the workspace menu offers no item for' },
  { suite: 'navigate', line: 'the workspace menu\'s item for Gamma is covered or gone', fails: '/nav-d-menu-gone', passes: '/nav-solo', file: 'scripts/lib/journey.ts', source: 'item for ${menu} is covered or gone' },
  { suite: 'navigate', line: 'still on /nav-s-stuck', fails: '/nav-d-stuck', passes: '/nav-home', file: 'scripts/lib/journey.ts', source: 'still on ${now.p}' },
  { suite: 'navigate', line: 'led to /elsewhere, which is neither', fails: '/nav-d-led', passes: '/nav-home', file: 'scripts/lib/journey.ts', source: 'led to ${now.p}' },
  { suite: 'navigate-timing-off', line: 'shows the heading "Hydrated root", not "Wrong heading"', fails: '/nav-root-hydrated', passes: '/nav-root-hydrated', passesSuite: 'navigate', file: 'scripts/lib/journey.ts', source: 'shows the heading' },
  { suite: 'navigate-timing-off', line: 'wrong-result: /nav-root-hydrated shows', fails: '/nav-root-hydrated', passes: '/nav-root-hydrated', passesSuite: 'navigate', file: 'scripts/lib/journey.ts', source: "new Fail(wrong ? 'wrong-result' : 'never-ready', why)" },
  { suite: 'navigate-timing-off', line: 'data never-ready: the shell was never reached', fails: '/nav-root-hydrated', passes: '/nav-root-hydrated', passesSuite: 'navigate', file: 'scripts/lib/journey.ts', source: 'the shell was never reached' },
  { suite: 'navigate-timing-off', line: 'interactive never-ready: the shell was never reached', fails: '/nav-root-hydrated', passes: '/nav-root-hydrated', passesSuite: 'navigate', file: 'scripts/lib/journey.ts', source: 'the shell was never reached' },
  { suite: 'navigate-timing-off', line: 'is there but never shows "Never shown"', fails: '/nav-root-target', passes: '/nav-root-target', passesSuite: 'navigate', file: 'scripts/lib/journey.ts', source: 'is there but never shows' },
  { suite: 'navigate-timing-off', line: 'tr.absent did not appear in 10000 ms', fails: '/nav-multi', passes: '/nav-multi', passesSuite: 'navigate', file: 'scripts/lib/journey.ts', source: 'did not appear in' },
  { suite: 'navigate', line: 'the page shows its error state', fails: '/nav-empty-error', passes: '/nav-empty', file: 'scripts/lib/journey.ts', source: 'the page shows its error state' },
  { suite: 'navigate', line: 'the control button.not-there was not pressable in', fails: '/nav-missing-target', passes: '/nav-home', file: 'scripts/lib/journey.ts', source: 'was not pressable in' },
  { suite: 'navigate', line: 'changed nothing on main button#toggle', fails: '/nav-dead-control', passes: '/nav-home', file: 'scripts/lib/journey.ts', source: 'changed nothing on' },
  { suite: 'navigate', line: 'interactive control-dead: pressing', fails: '/nav-dead-control', passes: '/nav-home', source: 'm.fail.kind}: ${m.fail.message}' },
  { suite: 'navigate-timing-on', line: 'data never-ready on a retake', fails: '/nav-retake', passes: '/nav-retake', passesSuite: 'navigate', source: 'on a retake: ' },
  { suite: 'navigate-timing-on', line: 'over its 1 ms budget', fails: '/nav-home', passes: '/nav-home', passesSuite: 'navigate', source: 'ms over its ${limits[name]} ms budget' },
];

type Entry = { page: string; suite: string; outcome: 'fail' | 'pass' | 'note' | 'measured' | 'clear'; line?: string; args?: string[] };
const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST: Entry[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/deep/expected.json'), 'utf8'));

describe('every rule a browser suite judges has a page it fails and a page it passes', () => {
  for (const r of RULES) {
    it(`${r.suite}: "${r.line}"`, () => {
      const fails = MANIFEST.filter((e) => e.suite === r.suite && e.page === r.fails && e.outcome === 'fail' && e.line && e.line.includes(r.line));
      const passes = MANIFEST.filter((e) => e.suite === (r.passesSuite ?? r.suite) && e.page === r.passes && (e.outcome === 'pass' || e.outcome === 'note' || (e.outcome === 'clear' && !!e.line && r.line.includes(e.line))));
      expect(fails.length, `no ${r.suite} case fails ${r.fails} printing "${r.line}"`).toBeGreaterThan(0);
      expect(passes.length, `no ${r.passesSuite ?? r.suite} case passes ${r.passes}`).toBeGreaterThan(0);
    });
  }
});

/**
 * Navigate's rules that no fixture page can hold, because the failure is printed before Chrome starts from a config, a
 * flag or the project's own files, or comes out of a function the page has no part in. Each runs scripts/navigate.ts (or the
 * function) twice: once where the rule fails, once corrected. Chrome is pointed at nothing, so a run that gets past its
 * checks ends at `not run` with exit 0 (`full` mode: 1), and the corrected run is told by never printing the line.
 */
type Expect = { code: number; has: string; not?: string };
type Probe = { args: string[]; config: string; tree?: string; expect: Expect };
type Precheck = { line: string; source: string | string[]; fails: Probe; passes: Probe };

const EMPTY = 'export default {};';
const MAPPED = (path: string, title = 'A') => `export default { navigationChecks: [{ path: '${path}', title: '${title}', readySelector: 'main', probe: 'toggle', controlSelector: 'button', resultSelector: 'button' }] };`;
const RAIL = ['--rail', '/a,/b'];
const NOT_RUN = 'not run';

const PRECHECKS: Precheck[] = [
  // The refusal itself is thrown by `workspaceHomes` in scripts/lib/journey.ts (HOMES_SOURCE); navigate prints it.
  { line: '--homes: bad is not <home>=<workspace>', source: ['FAIL    navigate: ${(e as Error).message}'],
    fails: { args: [...RAIL, '--homes', 'bad', '--routes', '/a'], config: EMPTY, expect: { code: 1, has: '--homes: bad is not <home>=<workspace>' } },
    passes: { args: [...RAIL, '--homes', '/a=Main', '--routes', '/a'], config: EMPTY, expect: { code: 0, has: NOT_RUN } } },
  { line: 'smokeRoutes: /zzz is not one of the rail routes', source: 'FAIL    navigate: ${(e as Error).message}',
    fails: { args: RAIL, config: 'export default { smokeRoutes: ["/zzz"] };', expect: { code: 1, has: 'smokeRoutes: /zzz is not one of the rail routes' } },
    passes: { args: RAIL, config: 'export default { smokeRoutes: ["/a"] };', expect: { code: 0, has: NOT_RUN } } },
  { line: 'src/app.config.ts has no `nav` array of groups', source: ["console.log(`${mode === 'full' ? 'FAIL   ' : 'not run'} navigate: ${reason}`)"],
    fails: { args: ['--mode', 'full', '--routes', '/a'], config: MAPPED('/a'), tree: 'export const nav = 5;', expect: { code: 1, has: 'FAIL    navigate: src/app.config.ts has no `nav` array of groups' } },
    passes: { args: ['--routes', '/a'], config: MAPPED('/a'), tree: "export const nav = [{ items: [{ href: '/a' }, { href: '/b' }] }];", expect: { code: 0, has: NOT_RUN } } },
  { line: '/a: no navigation check is configured', source: 'for (const e of coverage.errors) console.log(',
    fails: { args: [...RAIL, '--mode', 'full', '--routes', '/a'], config: EMPTY, expect: { code: 1, has: 'FAIL    /a: no navigation check is configured' } },
    passes: { args: [...RAIL, '--routes', '/a'], config: EMPTY, expect: { code: 0, has: 'warn    /a: no navigation check is configured', not: 'FAIL' } } },
  { line: 'navigation check has an empty title', source: 'for (const e of coverage.errors) console.log(',
    fails: { args: [...RAIL, '--routes', '/a'], config: MAPPED('/a', ''), expect: { code: 1, has: 'FAIL    /a: navigation check has an empty title' } },
    passes: { args: [...RAIL, '--routes', '/a'], config: MAPPED('/a'), expect: { code: 0, has: NOT_RUN, not: 'FAIL' } } },
  { line: 'Chrome could not start', source: ['not run ${route} ${device} shell not run', 'not run prefetch ${device}'],
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

/**
 * Journey failures only scripts/perf.ts can reach: navigate runs the warm condition, where nothing happens between the
 * first look for the menu's trigger and the second, and never refreshes live or refuses a prefetch. perf-live's cases and
 * scripts/perf.ts's own tests hold them.
 */
const HOMES_SOURCE = 'throw new Error(`--homes:';
const PERF_ONLY = [
  'a live refresh was still running', 'no refresh action started within', 'no refresh action answered', 'the router refresh after the verified live refresh did not finish',
  'had already been made before the press', 'the ${missing}, is covered or gone',
];

/**
 * Where each suite composes a failure. Every such place holds the `source` of a rule listed above, and every rule's
 * `source` is still in its file: a new place a suite can fail from is a new rule, listed here with its pages, or this
 * fails naming the line.
 */
const AUDIT = /(?:out\.(?:sideways|clipped|truncated|spills|overlap|unnamed|unmeasured|scrollers|contrast|targets|headings)|r\.focusless)\.push\(|`the [a-z]+ [a-z]+ \$\{|could not be measured:|answerProblem\(|new Set\(page\.errors\)/;
const NAVIGATE = /problems\.push\(|console\.error\(|throw new Error\(|console\.log\(`(?:FAIL|\$\{mode === 'full')|errors\.forEach\(|new Fail\(|e instanceof Fail|status: 'FAIL', shell|kib > cap \? 'FAIL|not run \$\{route\}|not run prefetch/;
const JOURNEY = /new Fail\(|now\.p /;
const SITES: { name: string; file: string; site: RegExp; sources: string[] }[] = [
  { name: 'audit', file: 'scripts/audit.ts', site: AUDIT, sources: sourcesOf((r) => r.suite === 'audit') },
  { name: 'presses', file: 'scripts/interactions.ts', site: /failures\.push\(/, sources: sourcesOf((r) => r.suite === 'presses') },
  { name: 'keyboard', file: 'scripts/keyboard.ts', site: /problems\.push\(/, sources: sourcesOf((r) => r.suite === 'keyboard') },
  { name: 'vitals', file: 'scripts/vitals.ts', site: /m\.(?:lcp|inp|cls|dropped) [>=]+ [\d.]+ && '|!!m\.answer/, sources: sourcesOf((r) => r.suite === 'vitals') },
  { name: 'navigate', file: 'scripts/navigate.ts', site: NAVIGATE, sources: [...sourcesOf((r) => r.suite.startsWith('navigate') && !r.file), ...PRECHECKS.flatMap((c) => c.source), 'cap ${cap} KiB', 'console.log(`FAIL    ${p}`)'] },
  { name: 'journey', file: 'scripts/lib/journey.ts', site: JOURNEY, sources: [...sourcesOf((r) => r.file === 'scripts/lib/journey.ts'), ...PERF_ONLY, HOMES_SOURCE] },
];

function sourcesOf(pick: (r: Rule) => boolean): string[] {
  return RULES.filter(pick).map((r) => r.source);
}

/** The places in `src` that can fail and that none of `sources` claims, as `file:line: text`. A comment is no place. */
function unclaimed(file: string, src: string, site: RegExp, sources: string[]): string[] {
  return src.split('\n').flatMap((line, i) => (site.test(line) && !/^\s*(\/\/|\*)/.test(line) && !sources.some((s) => line.includes(s)) ? [`${file}:${i + 1} can fail from here, and no rule here claims it: ${line.trim().slice(0, 140)}`] : []));
}

describe('every place a suite can fail from belongs to a listed rule', () => {
  for (const { name, file, site, sources } of SITES) {
    it(name, () => {
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      for (const s of sources) expect(src, `${file} no longer holds "${s}"`).toContain(s);
      expect(unclaimed(file, src, site, sources)).toEqual([]);
    });
  }

  it('names a failure site planted in a copy of navigate.ts and one in journey.ts', () => {
    const nav = SITES.find((s) => s.name === 'navigate')!;
    const jny = SITES.find((s) => s.name === 'journey')!;
    const navSrc = fs.readFileSync(path.join(ROOT, nav.file), 'utf8').replace('const failed = ', 'if (lines.length > 99) line.problems.push(`planted`);\n  const failed = ');
    expect(unclaimed(nav.file, navSrc, nav.site, nav.sources)).toEqual([expect.stringContaining('line.problems.push(`planted`)')]);
    const jnySrc = fs.readFileSync(path.join(ROOT, jny.file), 'utf8').replace('const spec = {', "if (!route) throw new Fail('never-ready', 'planted');\n  const spec = {");
    expect(unclaimed(jny.file, jnySrc, jny.site, jny.sources)).toEqual([expect.stringContaining("planted")]);
  });
});
