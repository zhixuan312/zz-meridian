import { describe, expect, it } from 'vitest';
import { compare, nextHistory, type ReleaseRecord } from '../scripts/lib/tier2.ts';

const rec = (version: string, value: number): ReleaseRecord => ({ version, commit: 'c', date: '2026-11-13', host: 'ci', values: [{ check: 'nav.interactive', page: '/usage', unit: 'ms', value }] });

describe('the Tier 2 history a release keeps', () => {
  it('puts the newest release first and keeps the last five', () => {
    let h = nextHistory(null, rec('0.1.0', 100));
    for (const [i, v] of ['0.1.1', '0.1.2', '0.1.3', '0.1.4', '0.1.5'].entries()) h = nextHistory(h, rec(v, 101 + i));
    expect(h.releases.map((r) => r.version)).toEqual(['0.1.5', '0.1.4', '0.1.3', '0.1.2', '0.1.1']);
  });

  it('is what the next run compares against', () => {
    const h = nextHistory(null, rec('0.1.0', 100));
    const { rows, baselineVersion, seeded } = compare(h, [{ check: 'nav.interactive', page: '/usage', unit: 'ms', value: 130 }], {});
    expect(baselineVersion).toBe('0.1.0');
    expect(seeded).toBe(false);
    expect(rows[0].previous).toBe(100);
  });
});
