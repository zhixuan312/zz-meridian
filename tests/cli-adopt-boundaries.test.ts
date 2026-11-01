// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Template } from '../cli/src/reconcile.ts';
import { adoptDependencies } from '../cli/src/adopt.ts';

describe('adoption dependency floors', () => {
  it.each([
    ['^19.0.0', '^19.2.0'], ['~16.0.0', '^16.2.1'], ['5.0.0', '^5.9.3'], ['^0.1.0', '^0.2.0'], ['^18.3.0', '^19.2.0'],
  ])('raises %s to the required %s in its existing section', (have, want) => {
    const pkg: Template = { devDependencies: { react: have } };
    adoptDependencies(pkg, { dependencies: { react: want } }, 'dependencies', ['react']);
    expect(pkg.devDependencies?.react).toBe(want);
    expect(pkg.dependencies?.react).toBeUndefined();
  });

  it('adds missing requirements, keeps newer floors, and preserves custom sources', () => {
    const pkg: Template = { dependencies: { next: '^16.3.0', react: 'workspace:*' } };
    adoptDependencies(pkg, { dependencies: { next: '^16.2.0', react: '^19.2.0', 'react-dom': '^19.2.0' } }, 'dependencies', ['next', 'react', 'react-dom']);
    expect(pkg.dependencies).toEqual({ next: '^16.3.0', react: 'workspace:*', 'react-dom': '^19.2.0' });
  });
});

