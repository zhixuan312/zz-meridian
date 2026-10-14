// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatCompact, formatCost } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { customerTitle } from '@/views/customer-context';
import { homeTitle } from '@/views/home-context';
import { revenueTitle } from '@/views/revenue-context';
import { usageTitle } from '@/views/usage-context';

/**
 * A page's title is worked out from its figures by a rule with a branch for each thing it may have to say, and what is
 * wrong today is said in the same sentence where the rule gives it a clause. These are the four titles of Main and
 * Business: Home, Usage, Revenue and One customer. Every branch is held to its words.
 */
const up = [{ name: 'Edge gateway', status: 'operational' }, { name: 'Inference API', status: 'operational' }, { name: 'Files', status: 'operational' }] as const;
const degraded = [up[0], { name: 'Inference API', status: 'degraded' }, up[2]] as const;
const down = [up[0], { name: 'Inference API', status: 'degraded' }, { name: 'Files', status: 'outage' }] as const;

describe('Home', () => {
  const month = { days: 30, revenue: 3_300_438.74, previous: 3_134_643.55, services: up };

  it('states a record with its figure, and its run when the periods before were records too', () => {
    expect(homeTitle({ ...month, record: { run: 3 }, services: degraded })).toBe(`The highest 30 days yet: ${formatCost(3_300_438.74)}, the 3rd record in a row`);
    expect(homeTitle({ ...month, record: { run: 2 } })).toBe(`The highest 30 days yet: ${formatCost(3_300_438.74)}, the 2nd record in a row`);
    expect(homeTitle({ ...month, days: 7, record: { run: 1 } })).toBe(`The highest 7 days yet: ${formatCost(3_300_438.74)}`);
    expect(homeTitle({ ...month, record: { run: 11 } })).toBe(`The highest 30 days yet: ${formatCost(3_300_438.74)}, the 11th record in a row`);
    expect(homeTitle({ ...month, record: { run: 21 } })).toBe(`The highest 30 days yet: ${formatCost(3_300_438.74)}, the 21st record in a row`);
  });

  it('otherwise states the change, and whether every service is operational', () => {
    expect(homeTitle({ ...month, record: null })).toBe('Revenue is up 5.3% on the 30 days before, and every service is operational');
    expect(homeTitle({ ...month, revenue: 3_000_000, previous: 3_210_000, record: null })).toBe('Revenue is down 6.5% on the 30 days before, and every service is operational');
    expect(homeTitle({ ...month, previous: 3_300_438.74, record: null })).toBe('Revenue is level with the 30 days before, and every service is operational');
  });

  it('names the service that is degraded or down, the worst first, and counts them when there are several', () => {
    expect(homeTitle({ ...month, record: null, services: degraded })).toBe('Revenue is up 5.3% on the 30 days before, and Inference API is degraded');
    expect(homeTitle({ ...month, record: null, services: down })).toBe('Revenue is up 5.3% on the 30 days before, and Files is down');
    expect(homeTitle({ ...month, record: null, services: [degraded[1], { name: 'Files', status: 'degraded' }] })).toBe('Revenue is up 5.3% on the 30 days before, and 2 services are degraded');
  });

  it('states the revenue alone when no period comes before', () => {
    expect(homeTitle({ days: 360, revenue: 27_710_624.39, previous: null, record: null, services: up })).toBe(`${formatCost(27_710_624.39)} of revenue in 360 days, and every service is operational`);
  });
});

describe('Usage', () => {
  const month = { days: 30, requests: 1_101_098_030, previous: 1_050_000_000 };

  it('states the requests, as the busiest period yet when it is a record', () => {
    expect(usageTitle({ ...month, record: { run: 1 } })).toBe(`${formatCompact(1_101_098_030)} requests in 30 days, the busiest 30 days yet`);
  });

  it('otherwise states them against the period before, or alone when none comes before', () => {
    expect(usageTitle({ ...month, record: null })).toBe(`${formatCompact(1_101_098_030)} requests in 30 days, 4.9% more than the 30 days before`);
    expect(usageTitle({ ...month, previous: 1_200_000_000, record: null })).toBe(`${formatCompact(1_101_098_030)} requests in 30 days, 8.2% less than the 30 days before`);
    expect(usageTitle({ days: 360, requests: 10_900_000_000, previous: null, record: null })).toBe(`${formatCompact(10_900_000_000)} requests in 360 days`);
  });
});

describe('Revenue', () => {
  const month = { days: 30, customers: 320, revenue: 3_300_438.74, previous: 3_134_643.55 };

  it('states an "all" when one holds, with the plan when it holds for a plan, and the record beside it', () => {
    expect(revenueTitle({ ...month, all: { count: 24, label: 'Enterprise' }, record: { run: 3 } })).toBe('All 24 Enterprise customers sent more this week than last, in the highest 30 days yet');
    expect(revenueTitle({ ...month, all: { count: 320, label: '' }, record: null })).toBe('All 320 customers sent more this week than last');
  });

  it('otherwise states how many paid how much, against the period before', () => {
    expect(revenueTitle({ ...month, all: null, record: { run: 3 } })).toBe(`320 customers paid ${formatCost(3_300_438.74)} in 30 days, 5.3% more than the 30 days before`);
    expect(revenueTitle({ ...month, previous: 3_500_000, all: null, record: null })).toBe(`320 customers paid ${formatCost(3_300_438.74)} in 30 days, 5.7% less than the 30 days before`);
    expect(revenueTitle({ ...month, previous: null, all: null, record: null })).toBe(`320 customers paid ${formatCost(3_300_438.74)} in 30 days`);
  });
});

describe('One customer', () => {
  const northwind = { name: 'Northwind Labs', status: 'active', revenue: 409_206.8, days: 30, week: 0.066, trialEnds: null, left: null } as const;

  it('states what an active customer paid and how its week is moving', () => {
    expect(customerTitle(northwind)).toBe(`Northwind Labs paid ${formatCost(409_206.8)} in 30 days and sent 6.6% more this week than last`);
    expect(customerTitle({ ...northwind, week: -0.031 })).toBe(`Northwind Labs paid ${formatCost(409_206.8)} in 30 days and sent 3.1% less this week than last`);
    expect(customerTitle({ ...northwind, week: null })).toBe(`Northwind Labs paid ${formatCost(409_206.8)} in 30 days`);
  });

  it('states first that a customer is past due', () => {
    expect(customerTitle({ ...northwind, name: 'Lumen Studio', status: 'past due', week: -0.042 })).toBe('Lumen Studio is past due, and sent 4.2% less this week than last');
    expect(customerTitle({ ...northwind, name: 'Lumen Studio', status: 'past due', week: null })).toBe('Lumen Studio is past due');
  });

  it('states when a trial ends, and when a customer left', () => {
    expect(customerTitle({ ...northwind, name: 'Brightline', status: 'trial', trialEnds: '2026-10-14' })).toBe(`Brightline is on a trial that ends on ${formatDate('2026-10-14')}`);
    expect(customerTitle({ ...northwind, name: 'Ambervale Motors', status: 'left', revenue: 0, week: null, left: '2026-03-02' })).toBe(`Ambervale Motors left on ${formatDate('2026-03-02')}`);
  });
});
