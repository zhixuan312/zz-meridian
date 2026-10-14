// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatPercent } from '@/lib/format';
import { nowTitle } from '@/views/now-context';
import { servicesTitle } from '@/views/services-context';

/**
 * The titles of the two Engineering pages. Now says what is wrong first, then what is waiting to ship; Services says the
 * uptime of its 90 days and the longest clean run when a service is on its longest. Every branch is held to its words.
 */
const up = [{ name: 'Edge gateway', status: 'operational' }, { name: 'Inference API', status: 'operational' }, { name: 'Files', status: 'operational' }] as const;

describe('Now', () => {
  it('says first what is down, else what is degraded, else that every service is operational', () => {
    expect(nowTitle({ services: [up[0], { name: 'Inference API', status: 'degraded' }, { name: 'Files', status: 'outage' }], testing: 3 })).toBe('Files is down, and 3 releases are in testing');
    expect(nowTitle({ services: [up[0], { name: 'Inference API', status: 'degraded' }, up[2]], testing: 3 })).toBe('Inference API is degraded, and 3 releases are in testing');
    expect(nowTitle({ services: up, testing: 3 })).toBe('All 3 services are operational, and 3 releases are in testing');
  });

  it('counts the services when several share the worst state', () => {
    expect(nowTitle({ services: [{ name: 'Inference API', status: 'outage' }, { name: 'Files', status: 'outage' }, up[0]], testing: 0 })).toBe('2 services are down, and no release is in testing');
    expect(nowTitle({ services: [{ name: 'Inference API', status: 'degraded' }, { name: 'Files', status: 'degraded' }], testing: 0 })).toBe('2 services are degraded, and no release is in testing');
  });

  it('says how many releases are in testing, one, several or none', () => {
    expect(nowTitle({ services: up, testing: 1 })).toBe('All 3 services are operational, and 1 release is in testing');
    expect(nowTitle({ services: up, testing: 0 })).toBe('All 3 services are operational, and no release is in testing');
  });
});

describe('Services', () => {
  it('says the uptime of its days, and the longest clean run when a service is on its longest', () => {
    expect(servicesTitle({ uptime: 0.99942, days: 90, run: { name: 'Edge gateway', length: 41 } })).toBe(`${formatPercent(0.99942, 2)} uptime in 90 days, and Edge gateway has run 41 days without a mark`);
    expect(servicesTitle({ uptime: 0.99942, days: 90, run: { name: 'Files', length: 1 } })).toBe(`${formatPercent(0.99942, 2)} uptime in 90 days, and Files has run 1 day without a mark`);
  });

  it('says the uptime alone when no service is on its longest run', () => {
    expect(servicesTitle({ uptime: 0.9991, days: 90, run: null })).toBe(`${formatPercent(0.9991, 2)} uptime in 90 days`);
  });
});
