import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusList, type Service, type ServiceStatus } from '@/components/patterns/status-list';

const end = new Date('2026-10-03T09:00:00Z');
const run = (state: ServiceStatus, n: number): ServiceStatus[] => Array.from({ length: n }, () => state);
const service = (name: string, days: ServiceStatus[]): Service => ({ name, description: `${name} in every region`, status: days[days.length - 1], uptime: 0.999, latency: 120, days });
const runs = (c: HTMLElement) => [...c.querySelectorAll('[data-run]')].map((e) => e.textContent);

describe('a status list: how long each service has run', () => {
  it('says nothing of runs unless asked', () => {
    const { container } = render(<StatusList services={[service('Gateway', run('operational', 90))]} end={end} />);
    expect(container.querySelector('[data-run]')).toBeNull();
  });

  it('counts the days since a service was last anything but operational, today included', () => {
    const days = [...run('operational', 49), 'degraded' as const, ...run('operational', 40)];
    const { container } = render(<StatusList run services={[service('Gateway', days)]} end={end} />);
    expect(runs(container)).toHaveLength(1);
    expect(runs(container)[0]).toMatch(/Operational for 40 days/);
    expect(runs(container)[0]).not.toMatch(/longest/);
  });

  it('marks a run its longest in the days kept when no run in them is longer', () => {
    const longest = [...run('operational', 20), 'outage' as const, ...run('operational', 69)];
    const tied = ['degraded' as const, ...run('operational', 44), 'degraded' as const, ...run('operational', 44)];
    const { container } = render(<StatusList run services={[service('Dashboard', longest), service('Files', tied)]} end={end} />);
    expect(runs(container)[0]).toMatch(/Operational for 69 days/);
    expect(runs(container)[0]).toMatch(/its longest in 90/);
    expect(runs(container)[1]).toMatch(/Operational for 44 days/);
    expect(runs(container)[1]).toMatch(/its longest in 90/);
  });

  it('says at least, and never its longest, for a run that reaches the earliest day kept', () => {
    const { container } = render(<StatusList run services={[service('Gateway', run('operational', 90))]} end={end} />);
    expect(runs(container)[0]).toMatch(/Operational for at least 90 days/);
    expect(runs(container)[0]).not.toMatch(/longest/);
  });

  it('says one day in the singular', () => {
    const days = [...run('operational', 88), 'degraded' as const, 'operational' as const];
    const { container } = render(<StatusList run services={[service('Gateway', days)]} end={end} />);
    expect(runs(container)[0]).toMatch(/Operational for 1 day(?!s)/);
    expect(runs(container)[0]).not.toMatch(/longest/);
  });

  it('says today for a service that is not operational now', () => {
    const degraded = [...run('operational', 89), 'degraded' as const];
    const down = [...run('operational', 89), 'outage' as const];
    const { container } = render(<StatusList run services={[service('Inference API', degraded), service('Webhooks', down)]} end={end} />);
    expect(runs(container)).toHaveLength(2);
    expect(runs(container)[0]).toMatch(/Degraded today/);
    expect(runs(container)[1]).toMatch(/Down today/);
    for (const text of runs(container)) expect(text).not.toMatch(/Operational for/);
  });
});
