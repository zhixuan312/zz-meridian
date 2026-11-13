import { describe, expect, it } from 'vitest';
import { deepPlan } from '../scripts/lib/deep-inputs.ts';

const reach = (files: string[]) => (files.includes('src/components/ui/button/index.tsx') ? ['tests/deep-dom.test.ts'] : []);

describe('which deep tests a release runs', () => {
  it('runs every deep test when a script, a journey or a deep test changed', () => {
    for (const f of ['scripts/audit.ts', 'scripts/fixtures/deep/server.ts', 'journeys/workspaces.ts', 'tests/deep-dom.test.ts']) {
      expect(deepPlan([f], reach), f).toEqual({ all: true, files: [] });
    }
  });

  it('runs only what the import graph reaches otherwise', () => {
    expect(deepPlan(['src/components/ui/button/index.tsx'], reach)).toEqual({ all: false, files: ['tests/deep-dom.test.ts'] });
  });

  it('runs none when nothing reaches them', () => {
    expect(deepPlan(['docs/testing.md'], reach)).toEqual({ all: false, files: [] });
  });
});
