// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveCoverage, selectSmokeRoutes, judgedNothingIn } from '../scripts/lib/coverage.ts';

const nav = ['/', '/usage', '/requests', '/services', '/settings'];
const check = (path: string) => ({ path, title: 'T', readySelector: 'main table', probe: 'sort' as const, controlSelector: 'th button', resultSelector: 'tbody tr' });

describe('smoke routes', () => {
  it('take the explicit list, or the landing route and the next two rail routes', () => {
    expect(selectSmokeRoutes({ smokeRoutes: ['/', '/requests', '/settings'], nav, landing: '/' })).toEqual(['/', '/requests', '/settings']);
    expect(selectSmokeRoutes({ nav, landing: '/' })).toEqual(['/', '/usage', '/requests']);
    expect(selectSmokeRoutes({ nav, landing: '/services' })).toEqual(['/services', '/', '/usage']);
  });
  it('refuse an explicit route that is not one of the rail routes, a duplicate or more than three', () => {
    expect(() => selectSmokeRoutes({ smokeRoutes: ['/nowhere'], nav, landing: '/' })).toThrow(/nowhere/);
    expect(() => selectSmokeRoutes({ smokeRoutes: ['/', '/'], nav, landing: '/' })).toThrow();
    expect(() => selectSmokeRoutes({ smokeRoutes: ['/', '/usage', '/requests', '/services'], nav, landing: '/' })).toThrow();
  });
});

describe('coverage', () => {
  it('reports an unmapped route as not configured in the default, a warning and not a pass', () => {
    const c = resolveCoverage('default', ['/', '/requests'], [check('/requests')]);
    expect(c.errors).toEqual([]);
    expect(c.routes).toEqual([
      { path: '/', data: 'not-configured', interaction: 'not-configured' },
      { path: '/requests', data: 'configured', interaction: 'configured' },
    ]);
    expect(c.warnings.some((l) => /(^|[\s'"`])\/($|[\s'"`,:.])/.test(l))).toBe(true);
  });
  it('fails an unmapped route in full and perf, naming it', () => {
    const names = (lines: string[]) => lines.some((l) => /(^|[\s'"`])\/($|[\s'"`,:.])/.test(l));
    for (const mode of ['full', 'perf'] as const) expect(names(resolveCoverage(mode, ['/', '/requests'], [check('/requests')]).errors), mode).toBe(true);
  });
  it('fails a broken mapping in every mode', () => {
    const broken = { ...check('/requests'), readySelector: '' };
    for (const mode of ['default', 'full', 'perf'] as const) expect(resolveCoverage(mode, ['/requests'], [broken]).errors.length).toBeGreaterThan(0);
    const unknown = { ...check('/requests'), probe: 'delete' as never };
    expect(resolveCoverage('default', ['/requests'], [unknown]).errors.length).toBeGreaterThan(0);
  });
});

describe('a rule that judged nothing is named, never read as a pass', () => {
  it('reads every judged-nothing line a check or a suite printed, rule by rule', () => {
    expect(judgedNothingIn('ok   tokens\njudged nothing: what the agent does here, the card contract\nkeyboard: 0 issues\njudged nothing: keyboard (no stop to tab to on any route)\n')).toEqual(['what the agent does here', 'the card contract', 'keyboard (no stop to tab to on any route)']);
    expect(judgedNothingIn('check: ok\n0 problems · 73 cards')).toEqual([]);
    // The assistant walk-through's sample steps a product removed: one each, a comma inside a step's name kept as its own.
    expect(judgedNothingIn("n/a  assistant on: explore_usage on /usage (gone)\njudged nothing: assistant: Home's view context; the Ask on its revenue card and view_home, assistant: explore_usage on /usage\n")).toEqual(["assistant: Home's view context; the Ask on its revenue card and view_home", 'assistant: explore_usage on /usage']);
  });
});
