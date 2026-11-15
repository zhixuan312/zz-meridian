// @vitest-environment node
// Six cases assert only through `// @ts-expect-error`: a dialog must have a name, `formatRelative` must be told the
// clock, and four chart and proposal forms must refuse what they cannot draw. Nothing failed when those types widened —
// the directive becomes unused (TS2578), `tsc --noEmit` exits non-zero, and the type check is **Tier 3**, which reports
// and never fails a run. So the invariants those cases carry were enforced by nothing.
//
// The type check stays Tier 3 (lint and types report; only Tier 1 blocks), so the gate is here instead: this test
// compiles the tree and fails the run when TypeScript refuses it, which includes a directive that no longer errors.
// It imports the six subjects, so a change to any of them selects this test rather than leaving it out of a related run.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import '@/components/ui/popover';
import '@/lib/format-date';
import '@/components/charts/bar-list';
import '@/components/charts/column-chart';
import '@/components/charts/trend-chart';
import '@/components/patterns/proposal';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('the type contracts the @ts-expect-error cases carry', () => {
  it('compiles: a widened type makes its directive unused, and this is what fails the run', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit'], { cwd: ROOT, encoding: 'utf8' });
    // The decisive line is tsc's own first error; an empty output is the pass.
    const first = (r.stdout ?? '').split('\n').find((l) => l.includes('error TS')) ?? '';
    expect(r.status, `${first}\n${r.stderr ?? ''}`).toBe(0);
    expect(r.stdout ?? '').not.toContain('error TS2578');
  }, 180_000);
});
