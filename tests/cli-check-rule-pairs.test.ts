// Named cli-* so the payload leaves it out: it reads scripts/fixtures/deep/, which only Meridian's repository has.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every rule a browser suite judges, and the two fixture pages that hold it: one the rule must fail, with the line it
 * prints, and one it must pass. A rule with only a page that passes is a rule nothing shows can fire, and a rule with
 * only a page that fails is one that might fire on everything; either kind reached adopters as a red on correct code or
 * a green on broken code (#23, #43, #52, #65, #66, #82, #86). The cases themselves run in tests/deep-checks.test.ts;
 * this holds that each rule has both, and that a message a suite can print belongs to a rule listed here.
 */
type Rule = {
  /** The suite in scripts/fixtures/deep/expected.json. */
  suite: 'audit' | 'presses' | 'keyboard' | 'vitals' | 'navigate';
  /** Text every line the rule prints carries, as the manifest's `line` holds it. */
  line: string;
  /** The page the rule fails, and the one it passes (a corrected twin, or the clean page where nothing else fits). */
  fails: string;
  passes: string;
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
];

type Entry = { page: string; suite: string; outcome: 'fail' | 'pass' | 'note' | 'measured' | 'clear'; line?: string; args?: string[] };
const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST: Entry[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/deep/expected.json'), 'utf8'));

describe('every rule a browser suite judges has a page it fails and a page it passes', () => {
  for (const r of RULES) {
    it(`${r.suite}: "${r.line}"`, () => {
      const fails = MANIFEST.filter((e) => e.suite === r.suite && e.page === r.fails && e.outcome === 'fail' && e.line && e.line.includes(r.line));
      const passes = MANIFEST.filter((e) => e.suite === r.suite && e.page === r.passes && (e.outcome === 'pass' || (e.outcome === 'clear' && !!e.line && r.line.includes(e.line))));
      expect(fails.length, `no ${r.suite} case fails ${r.fails} printing "${r.line}"`).toBeGreaterThan(0);
      expect(passes.length, `no ${r.suite} case passes ${r.passes}`).toBeGreaterThan(0);
    });
  }
});

/**
 * Where each suite composes a failure. Every such place holds the `source` of a rule listed above, and every rule's
 * `source` is still in its suite: a new place a suite can fail from is a new rule, listed here with its pages, or this
 * fails naming the line.
 */
const SITES: Record<Rule['suite'], { file: string; site: RegExp }> = {
  audit: { file: 'scripts/audit.ts', site: /(?:out\.(?:sideways|clipped|truncated|spills|overlap|unnamed|unmeasured|scrollers|contrast|targets|headings)|r\.focusless)\.push\(|`the [a-z]+ [a-z]+ \$\{|could not be measured:|answerProblem\(|new Set\(page\.errors\)/ },
  presses: { file: 'scripts/interactions.ts', site: /failures\.push\(/ },
  keyboard: { file: 'scripts/keyboard.ts', site: /problems\.push\(/ },
  vitals: { file: 'scripts/vitals.ts', site: /m\.(?:lcp|inp|cls|dropped) [>=]+ [\d.]+ && '|!!m\.answer/ },
  navigate: { file: 'scripts/navigate.ts', site: /(?!)/ },
};

describe('every place a suite can fail from belongs to a listed rule', () => {
  for (const [suite, { file, site }] of Object.entries(SITES)) {
    it(suite, () => {
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      const sources = RULES.filter((r) => r.suite === suite).map((r) => r.source);
      for (const s of sources) expect(src, `${file} no longer holds "${s}"`).toContain(s);
      src.split('\n').forEach((line, i) => {
        // A place in the suite where a failure is composed, and not a comment about one.
        if (!site.test(line) || /^\s*(\/\/|\*)/.test(line)) return;
        expect(sources.some((s) => line.includes(s)), `${file}:${i + 1} can fail from here, and no rule here claims it: ${line.trim().slice(0, 140)}`).toBe(true);
      });
    });
  }
});
