// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatReport, isNewer, supportsSource } from '../cli/src/update.ts';

const rows = [
  { path: 'src/lib/cn.ts', disposition: 'untouched', action: 'write' },
  { path: 'src/components/ui/button/index.tsx', disposition: 'edited', action: 'stage' },
  { path: 'src/components/ui/card/index.tsx', disposition: 'edited', action: 'leave' },
  { path: 'src/lib/period.ts', disposition: 'local-deletion', action: 'stage' },
  { path: 'src/app.config.ts', disposition: 'team-preserved', action: 'leave' },
  { path: 'src/lib/live.ts', disposition: 'added', action: 'write' },
  { path: 'src/lib/old.ts', disposition: 'removed', action: 'delete' },
] as const;

describe('formatReport', () => {
  it('lists only what needs a decision by default, and aggregates the rest', () => {
    const out = formatReport([...rows], { verbose: false });
    expect(out).toMatch(/edited\s+src\/components\/ui\/button\/index\.tsx\s+merge required/);
    expect(out).toMatch(/local-deletion\s+src\/lib\/period\.ts\s+decide: delete or restore/);
    for (const quiet of ['src/lib/cn.ts', 'src/components/ui/card/index.tsx', 'src/app.config.ts', 'src/lib/live.ts', 'src/lib/old.ts']) expect(out).not.toContain(quiet);
    expect(out).toContain('summary: 2 conflicts · aggregated: untouched 2, added 1, removed 1, team-preserved 1');
  });
  it('says "1 conflict" in the singular', () => {
    expect(formatReport([rows[1]], { verbose: false })).toContain('summary: 1 conflict · aggregated: untouched 0, added 0, removed 0, team-preserved 0');
  });
  it('lists every path with verbose', () => {
    const out = formatReport([...rows], { verbose: true });
    for (const r of rows) expect(out).toContain(r.path);
  });
});

describe('versions', () => {
  it.each([['0.5.0', '0.3.0', true], ['0.5.0', '0.4.0', true], ['0.5.0', '0.5.0', false], ['0.4.0', '0.5.0', false], ['0.10.0', '0.9.0', true]] as const)('%s over %s is %s', (t, s, want) => {
    expect(isNewer(t, s)).toBe(want);
  });
  it.each([['0.2.0', false], ['0.0.0', false], ['0.3.0', true], ['0.4.0', true], ['1.0.0', true]] as const)('supportsSource(%s) is %s', (v, want) => {
    expect(supportsSource(v)).toBe(want);
  });
});
