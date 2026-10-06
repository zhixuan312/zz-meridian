// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BEGIN, END, managedBlock } from '../cli/src/context.ts';
import { externalPackages, legacySection, planAgents, reconcilePackage } from '../cli/src/reconcile.ts';

const template = {
  dependencies: { next: '16.3.8', react: '19.3.0', 'react-dom': '19.3.0', zod: '4.6.5', clsx: '^2.1.1' },
  devDependencies: { typescript: '6.0.3' },
  scripts: { gate: 'node scripts/gate.ts', verify: 'node scripts/verify.ts' },
};
const need = { runtime: ['next', 'react', 'react-dom', 'zod', 'clsx'], dev: ['typescript'], scripts: ['gate', 'verify'] };
const exact = { next: '16.3.8', react: '19.3.0', 'react-dom': '19.3.0', zod: '4.6.5', clsx: '^2.1.1' };
const pkg = (o: object, indent = 2) => JSON.stringify({ name: 'team-app', private: true, ...o }, null, indent) + '\n';
const plan = (o: object) => reconcilePackage(pkg(o), template, need);
const after = (o: object) => JSON.parse(plan(o).text ?? pkg(o));
const ids = (o: object) => plan(o).migrations.map((m) => m.id);

describe('reconcilePackage', () => {
  it('adds what is missing at the tested specification', () => {
    const p = after({});
    expect(p.dependencies).toEqual(exact);
    expect(p.devDependencies).toEqual({ typescript: '6.0.3' });
    expect(p.scripts).toEqual(template.scripts);
    expect(ids({})).toEqual([]);
  });
  it('raises an older entry, same major included', () => {
    const r = plan({ dependencies: { ...exact, next: '^16.1.0', zod: '~4.1.0' }, devDependencies: { typescript: '6.0.3' }, scripts: template.scripts });
    const p = JSON.parse(r.text!);
    expect(p.dependencies.next).toBe('16.3.8');
    expect(p.dependencies.zod).toBe('4.6.5');
    expect(r.changes.join('\n')).toMatch(/next/);
    expect(r.changes.join('\n')).toMatch(/zod/);
  });
  it('reports an older major as incompatible and leaves it', () => {
    const o = { dependencies: { ...exact, next: '^15.2.0' }, devDependencies: { typescript: '6.0.3' }, scripts: template.scripts };
    expect(after(o).dependencies.next).toBe('^15.2.0');
    expect(ids(o)).toContain('dependency:next');
  });
  it('keeps CRLF line endings', () => {
    const r = reconcilePackage(pkg({}).replace(/\n/g, '\r\n'), template, need);
    expect(r.text!.includes('\r\n')).toBe(true);
    expect(/[^\r]\n/.test(r.text!)).toBe(false);
  });
  it('reports a newer requirement and never downgrades it', () => {
    const o = { dependencies: { ...exact, next: '16.4.0' }, devDependencies: { typescript: '6.0.3' }, scripts: template.scripts };
    expect(after(o).dependencies.next).toBe('16.4.0');
    expect(ids(o)).toContain('dependency:next');
  });
  it('reports a nonstandard specification', () => {
    for (const spec of ['workspace:*', 'latest', 'github:colinhacks/zod', '^4.0.0 || ^5.0.0']) {
      const o = { dependencies: { ...exact, zod: spec }, devDependencies: { typescript: '6.0.3' }, scripts: template.scripts };
      expect(after(o).dependencies.zod, spec).toBe(spec);
      expect(ids(o), spec).toContain('dependency:zod');
    }
  });
  it('reads a partial version, such as ^24, as its minimum, and leaves an entry equal to the template alone', () => {
    const t = { ...template, devDependencies: { ...template.devDependencies, '@types/node': '^24' } };
    const run = (have: string) => reconcilePackage(pkg({ dependencies: exact, devDependencies: { typescript: '6.0.3', '@types/node': have }, scripts: template.scripts }), t, { ...need, dev: [...need.dev, '@types/node'] });
    expect(run('^24').migrations.map((m) => m.id)).not.toContain('dependency:@types/node');
    expect(run('^24').changes.some((c) => c.includes('@types/node'))).toBe(false);
    expect(run('^23').migrations.map((m) => m.id)).toContain('dependency:@types/node');
  });
  it('reports an override of a needed package', () => {
    expect(ids({ dependencies: exact, devDependencies: { typescript: '6.0.3' }, scripts: template.scripts, pnpm: { overrides: { react: '19.2.0' } } })).toContain('dependency-override:react');
  });
  it('reports a conflicting script and keeps it', () => {
    const o = { dependencies: exact, devDependencies: { typescript: '6.0.3' }, scripts: { ...template.scripts, gate: 'eslint .' } };
    expect(after(o).scripts.gate).toBe('eslint .');
    expect(ids(o)).toContain('script:gate');
  });
  it('changes nothing when everything already holds', () => {
    expect(plan({ dependencies: exact, devDependencies: { typescript: '6.0.3' }, scripts: template.scripts })).toEqual({ text: null, changes: [], migrations: [] });
  });
  it('raises an entry where it already is', () => {
    const p = after({ dependencies: { ...exact, typescript: '6.0.0' }, scripts: template.scripts });
    expect(p.dependencies.typescript).toBe('6.0.3');
    expect(p.devDependencies?.typescript).toBeUndefined();
  });
  it('keeps unrelated keys, their order and the indentation', () => {
    const r = reconcilePackage(pkg({ engines: { node: '>=22' }, dependencies: { lodash: '4.17.21' } }, 4), template, need);
    const p = JSON.parse(r.text!);
    expect(Object.keys(p).slice(0, 3)).toEqual(['name', 'private', 'engines']);
    expect(p.dependencies.lodash).toBe('4.17.21');
    expect(r.text!.split('\n')[1].startsWith('    "')).toBe(true);
    expect(r.text!.endsWith('}\n')).toBe(true);
  });
  it('writes nothing to a package.json it cannot read', () => {
    const r = reconcilePackage('{ not json', template, need);
    expect(r.text).toBeNull();
    expect(r.migrations.map((m) => m.id)).toEqual(['package-json']);
  });
});

describe('externalPackages', () => {
  it('lists the packages the distributed modules import', () => {
    expect(externalPackages(new Map([
      ['src/lib/a.ts', "import { z } from 'zod';\nimport fs from 'node:fs';\nimport x from './x';\nimport type { T } from '@/y';\nexport * from 'clsx';\nconst m = await import('@ai-sdk/react/dist');"],
      ['src/components/b.tsx', "import { Slot } from 'radix-ui';\nimport { cn } from '@meridian/lib/cn';\nimport 'path';"],
      ['src/styles/x.css', "@import 'tailwindcss';"],
    ]))).toEqual(['@ai-sdk/react', 'clsx', 'radix-ui', 'zod']);
  });
});

describe('AGENTS.md', () => {
  const block = managedBlock('0.5.0', 'pnpm');
  const legacyText = '# Built on ZZ Meridian\n\nThe interface is built on ZZ Meridian.\n- a rule';
  it('takes the legacy section from the base replay', () => {
    expect(legacySection(`${legacyText}\n`, 'adopt')).toBe(legacyText);
    expect(legacySection('<!-- BEGIN:nextjs-agent-rules -->\nN\n<!-- END:nextjs-agent-rules -->\n\n# Working in this dashboard\n\nRules.\n', 'create')).toBe('# Working in this dashboard\n\nRules.');
    expect(legacySection(null, 'adopt')).toBeUndefined();
  });
  it('replaces the exact legacy section and keeps the team text', () => {
    const r = planAgents(`Our own rules.\n\n${legacyText}\n`, block, legacyText);
    expect(r.migration).toBeNull();
    expect(r.text).toBe(`Our own rules.\n\n${block}\n`);
  });
  it('turns an edited legacy section into a migration and writes nothing', () => {
    const r = planAgents('Ours.\n\n# Built on ZZ Meridian\n\nThe interface is built on ZZ Meridian.\n- our own edit\n', block, legacyText);
    expect(r.text).toBeNull();
    expect(r.migration?.id).toBe('agents-md');
  });
  it('updates the managed block in place', () => {
    const r = planAgents(`Team.\n\n${managedBlock('0.4.9', 'pnpm')}\n\nMore team.\n`, block);
    expect(r.text).toBe(`Team.\n\n${block}\n\nMore team.\n`);
    expect(r.text!.split(BEGIN)).toHaveLength(2);
    expect(r.text!.split(END)).toHaveLength(2);
  });
  it('is a no-op when the block is current, and leaves a missing file missing', () => {
    expect(planAgents(`x\n\n${block}\n`, block)).toEqual({ text: null, migration: null });
    expect(planAgents(null, block)).toEqual({ text: null, migration: null });
  });
});
