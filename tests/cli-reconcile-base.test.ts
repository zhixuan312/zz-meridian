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

describe('a script the release dropped', () => {
  // 0.39.0 removed gate and verify and their files, and stopped shipping `test`.
  const oldBase = { dependencies: base.dependencies, devDependencies: base.devDependencies, scripts: { ...base.scripts, gate: 'node scripts/gate.ts', verify: 'node scripts/verify.ts', test: 'vitest run' } };
  const old = { dependencies: base.dependencies, devDependencies: base.devDependencies, scripts: oldBase.scripts };
  // What the target release still ships: test-run.ts stays, gate.ts and verify.ts are retired, live.ts stays for the
  // browser suites even though the script that ran it is gone.
  const shipped = new Set(['scripts/test-run.ts', 'scripts/live.ts']);
  const planOld = (scripts: Record<string, string>) => reconcilePackage(pkg({ dependencies: base.dependencies, devDependencies: base.devDependencies, scripts }), template, need, oldBase, shipped);
  it('is removed when it is still what the release wrote and names a file the update retires', () => {
    const withoutTest = Object.fromEntries(Object.entries(old.scripts).filter(([name]) => name !== 'test'));
    const r = planOld(withoutTest);
    const scripts = JSON.parse(r.text!).scripts;
    expect(scripts).not.toHaveProperty('gate');
    expect(scripts).not.toHaveProperty('verify');
    expect(r.changes).toEqual(expect.arrayContaining(['removed script gate', 'removed script verify']));
    expect(r.migrations).toEqual([]);
  });
  it('is kept and named when its command still works, since the team may rely on it', () => {
    const r = planOld(old.scripts);
    expect(JSON.parse(r.text!).scripts.test).toBe('vitest run');
    expect(r.migrations.map((m) => m.id)).toEqual(['script:test']);
  });
  it('is the team\'s when they changed it, as a migration naming the missing file', () => {
    const r = planOld({ ...old.scripts, gate: 'node scripts/gate.ts --verbose' });
    expect(JSON.parse(r.text!).scripts.gate).toBe('node scripts/gate.ts --verbose');
    expect(r.migrations.map((m) => m.id)).toEqual(expect.arrayContaining(['script:gate', 'script:test']));
  });
  it('names the lost file only when the team\'s script actually calls one', () => {
    const r = planOld({ ...oldBase.scripts, test: 'vitest run --coverage' });
    const test = r.migrations.find((m) => m.id === 'script:test')!;
    expect(test.summary).toBe("script \"test\" is no longer part of Meridian's toolchain");
    expect(test.summary).not.toMatch(/calls/);
    const gate = planOld({ ...oldBase.scripts, gate: 'node scripts/gate.ts --verbose' }).migrations.find((m) => m.id === 'script:gate')!;
    expect(gate.summary).toBe('script "gate" calls scripts/gate.ts, a file this release removed');
  });
  it('removes nothing when the caller cannot say what the target ships', () => {
    // The production caller passes the target payload; without it the safe answer is to keep the script and name it.
    const r = reconcilePackage(pkg({ dependencies: base.dependencies, devDependencies: base.devDependencies, scripts: oldBase.scripts }), template, need, oldBase);
    expect(JSON.parse(r.text!).scripts.gate).toBe('node scripts/gate.ts');
    expect(r.migrations.map((m) => m.id)).toEqual(expect.arrayContaining(['script:gate']));
  });
  it('stays when the file it names still ships, named for the team to decide', () => {
    const liveBase = { ...oldBase, scripts: { ...oldBase.scripts, live: 'node scripts/live.ts' } };
    const r = reconcilePackage(pkg({ dependencies: base.dependencies, devDependencies: base.devDependencies, scripts: liveBase.scripts }), template, need, liveBase, shipped);
    expect(JSON.parse(r.text!).scripts.live).toBe('node scripts/live.ts');
    expect(r.migrations.map((m) => m.id)).toEqual(expect.arrayContaining(['script:live', 'script:test']));
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
