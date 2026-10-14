import { render, screen } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it } from 'vitest';
import { UsageBody } from '@/views/usage';
import { CustomersView } from '@/views/customers';
import { ServicesBody } from '@/views/services';
import { HomeBody } from '@/views/home';
import { homeData } from '@/views/home-parts';

const totals = { requests: 0, errorRate: 0, p95: 0, revenue: 0 };
const NOW = '2026-10-05T09:00:00.000Z';

describe('a page body with no data shows its empty state, not a route error', () => {
  it('Home, with no complete day kept', () => {
    const { container } = render(<HomeBody {...homeData({ period: '30d', day: null, days: { series: [], previous: [], totals: { current: totals, previous: null }, running: null }, history: [], customers: [], usage: [], models: [], compute: [], services: [], incidents: [], releases: [], tickets: [], updatedAt: NOW, now: NOW })} />);
    expect(screen.getByText('No requests have arrived yet')).toBeTruthy();
    // Said once, and no figure drawn as if there were one: no revenue of $0, no tile, no chart.
    expect(container.querySelectorAll('h2')).toHaveLength(0);
    expect(container.textContent).not.toMatch(/\$0|Revenue ·|Customers/);
  });
  it('Usage, with no complete day kept', () => {
    const { container } = render(<UsageBody period="30d" head={{ title: null, facts: [] }} line={null} days={{ series: [], totals: { current: totals, previous: null }, running: null }} calendar={{ days: [], running: false, busiest: null }} figures={null} endpoints={[]} responses={[]} unread={[]} updatedAt={NOW} now={NOW} />);
    expect(screen.getByText('No requests have arrived yet')).toBeTruthy();
    // Said once, and no part drawn as if a request had arrived.
    expect(container.querySelectorAll('h2')).toHaveLength(0);
  });
  it('Services, with no services', () => {
    const { container } = render(<ServicesBody services={[]} incidents={{ open: [], resolved: [] }} head={{ title: null, facts: [] }} updatedAt={NOW} now={NOW} />);
    expect(screen.getByText('No services yet')).toBeTruthy();
    // Said once, and no part drawn: no list of services and no list of incidents.
    expect(container.querySelectorAll('h2')).toHaveLength(0);
  });
  it('Customers, with no customers', () => {
    render(<Tooltip.Provider><CustomersView rows={[]} /></Tooltip.Provider>);
    expect(screen.getByText('No customers yet')).toBeTruthy();
  });
});
