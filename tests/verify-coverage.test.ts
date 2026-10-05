// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveCoverage, selectSmokeRoutes } from '../scripts/lib/coverage.ts';

const nav = ['/', '/analytics', '/requests', '/health', '/settings'];
const check = (path: string) => ({ path, title: 'T', readySelector: 'main table', probe: 'sort' as const, controlSelector: 'th button', resultSelector: 'tbody tr' });

describe('smoke routes', () => {
  it('take the explicit list, or the landing route and the next two rail routes', () => {
    expect(selectSmokeRoutes({ smokeRoutes: ['/', '/requests', '/settings'], nav, landing: '/' })).toEqual(['/', '/requests', '/settings']);
    expect(selectSmokeRoutes({ nav, landing: '/' })).toEqual(['/', '/analytics', '/requests']);
    expect(selectSmokeRoutes({ nav, landing: '/health' })).toEqual(['/health', '/', '/analytics']);
  });
  it('refuse an explicit route that is not one of the rail routes, a duplicate or more than three', () => {
    expect(() => selectSmokeRoutes({ smokeRoutes: ['/nowhere'], nav, landing: '/' })).toThrow(/nowhere/);
    expect(() => selectSmokeRoutes({ smokeRoutes: ['/', '/'], nav, landing: '/' })).toThrow();
    expect(() => selectSmokeRoutes({ smokeRoutes: ['/', '/analytics', '/requests', '/health'], nav, landing: '/' })).toThrow();
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
