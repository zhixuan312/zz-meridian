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

  it('manages tests/setup.ts and no other test in a created project', () => {
    const payload = ['tests/setup.ts', 'tests/format.test.ts', 'tests/examples/example-data.test.ts', 'src/lib/cn.ts', 'tokens/zz-meridian.resolver.json'];
    const created = managedPaths(payload, 'create');
    expect(created.has('tests/setup.ts')).toBe(true);
    expect(created.has('tests/format.test.ts')).toBe(false);
    expect(created.has('tests/examples/example-data.test.ts')).toBe(false);
    expect([...created].sort()).toEqual([...managedPaths(payload, 'adopt')].sort());
  });
});
