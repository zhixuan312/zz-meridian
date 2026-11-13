import { describe, expect, it } from 'vitest';
import { PAYLOAD_EXCLUDE } from '../cli/scripts/build-payload.ts';
import { managedPaths } from '../cli/src/ownership.ts';

describe('what a project receives from tests/', () => {
  it('ships tests/setup.ts and the examples, and no other test or helper', () => {
    for (const kept of ['tests/setup.ts', 'tests/examples/example-data.test.ts', 'tests/examples/example-page.test.tsx']) {
      expect(PAYLOAD_EXCLUDE.test(kept), kept).toBe(false);
    }
    for (const left of ['tests/format.test.ts', 'tests/key-value.test.tsx', 'tests/served.tsx', 'tests/sample-present.ts', 'tests/cli-ownership.test.ts', 'tests/deep-dom.test.ts', 'tests/tsconfig-scope.test.ts']) {
      expect(PAYLOAD_EXCLUDE.test(left), left).toBe(true);
    }
  });

  it('manages tests/setup.ts and no other test in a project this release creates', () => {
    const shipped = ['tests/setup.ts', 'tests/examples/example-data.test.ts', 'tests/examples/example-page.test.tsx', 'src/lib/cn.ts', 'tokens/zz-meridian.resolver.json'];
    const created = managedPaths(shipped, 'create');
    expect([...created].filter((p) => p.startsWith('tests/'))).toEqual(['tests/setup.ts']);
  });

  it("counts an older release's shipped tests as Meridian's on the create route, so an update can remove them", () => {
    const older = ['tests/setup.ts', 'tests/format.test.ts', 'src/lib/cn.ts'];
    expect(managedPaths(older, 'create').has('tests/format.test.ts')).toBe(true);
    expect(managedPaths(older, 'adopt').has('tests/format.test.ts')).toBe(false);
  });
});
