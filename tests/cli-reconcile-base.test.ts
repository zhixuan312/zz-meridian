// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { needOf, reconcilePackage } from '../cli/src/reconcile.ts';

// The release the project came from wrote these entries; the target tests newer majors of two of them.
const base = { dependencies: { next: '16.1.0', react: '19.2.0', 'react-dom': '19.2.0' }, devDependencies: { typescript: '^5.9.0', eslint: '^9.0.0' }, scripts: { 'test:t1': 'node scripts/test-run.ts t1 --old', 'test:t2': 'node scripts/test-run.ts t2' } };
const template = { dependencies: { next: '16.3.8', react: '19.3.0', 'react-dom': '19.3.0' }, devDependencies: { typescript: '6.0.3', eslint: '^10.1.0' }, scripts: { 'test:t1': 'node scripts/test-run.ts t1', 'test:t2': 'node scripts/test-run.ts t2' } };
const need = { runtime: ['next', 'react', 'react-dom'], dev: ['typescript', 'eslint'], scripts: ['test:t1', 'test:t2'] };
const pkg = (o: object) => JSON.stringify({ name: 'team-app', ...o }, null, 2) + '\n';
const plan = (o: object) => reconcilePackage(pkg(o), template, need, base);

describe('reconcilePackage against the base release', () => {
  it("raises an entry across a major when it is still exactly what Meridian wrote", () => {
    const r = plan({ dependencies: base.dependencies, devDependencies: base.devDependencies, scripts: base.scripts });
    const p = JSON.parse(r.text!);
    expect(p.devDependencies).toEqual({ typescript: '6.0.3', eslint: '^10.1.0' });
    expect(p.dependencies).toEqual(template.dependencies);
    expect(r.migrations).toEqual([]);
  });
  it('updates a script that is still exactly what Meridian wrote', () => {
    const r = plan({ dependencies: template.dependencies, devDependencies: template.devDependencies, scripts: base.scripts });
    expect(JSON.parse(r.text!).scripts['test:t1']).toBe('node scripts/test-run.ts t1');
    expect(r.migrations).toEqual([]);
  });
  it('leaves a lower major the team chose to them, as a migration', () => {
    const r = plan({ dependencies: template.dependencies, devDependencies: { typescript: '^5.4.0', eslint: '^10.1.0' }, scripts: template.scripts });
    expect(r.text).toBeNull();
    expect(r.migrations.map((m) => m.id)).toEqual(['dependency:typescript']);
  });
  it('leaves a script the team changed to them, as a migration', () => {
    const r = plan({ dependencies: template.dependencies, devDependencies: template.devDependencies, scripts: { ...template.scripts, 'test:t1': 'node scripts/test-run.ts t1 --fast' } });
    expect(r.migrations.map((m) => m.id)).toEqual(['script:test:t1']);
  });
});

describe('needOf', () => {
  it('always needs the framework the template declares, imported or not', () => {
    const n = needOf(template, new Map([['src/lib/a.ts', "import { cn } from './cn';"]]));
    expect(n.runtime).toEqual(expect.arrayContaining(['next', 'react', 'react-dom']));
    expect(n.dev).toEqual(['typescript', 'eslint']);
    expect(n.scripts).toEqual(['test:t1', 'test:t2']);
  });
  it('needs what the distributed modules import, when the template declares it', () => {
    expect(needOf({ ...template, dependencies: { ...template.dependencies, clsx: '^2.1.1' } }, new Map([['src/lib/cn.ts', "import { clsx } from 'clsx';\nimport { x } from 'undeclared';"]])).runtime).toEqual(['clsx', 'next', 'react', 'react-dom']);
  });
});
