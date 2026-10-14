import { render, screen } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it } from 'vitest';
import { UsageBody } from '@/views/usage';
import { CustomersView } from '@/views/customers';
import { ServicesBody } from '@/views/services';
import { HomeBody } from '@/views/home';

const totals = { requests: 0, errorRate: 0, p95: 0, revenue: 0 };
const NOW = '2026-10-05T09:00:00.000Z';

describe('a page body with no data shows its empty state, not a route error', () => {
  it('Home, with no requests', () => {
    render(<HomeBody period="30d" incidents={[]} updatedAt={NOW} series={[]} totals={{ current: totals, previous: null }} running={null} endpoints={[]} mix={[]} activity={[]} now={NOW} summary={{ business: null, operation: null, delivery: null }} head={{ title: null, facts: [] }} unwell={null} />);
    expect(screen.getByText('No requests yet')).toBeTruthy();
    // The three regions draw without traffic: here each says its summary is unavailable.
    for (const name of ['Business', 'Operation', 'Delivery']) expect(screen.getByRole('region', { name }).textContent).toMatch(/unavailable/);
  });
  it('Usage, with no requests in the period', () => {
    render(<UsageBody period="30d" activity={[]} incidents={[]} updatedAt={NOW} now={NOW} series={[]} totals={{ current: totals, previous: null }} heat={[]} hours={[]} regions={[]} endpoints={[]} head={{ title: null, facts: [] }} />);
    expect(screen.getByText('No requests in this period')).toBeTruthy();
  });
  it('Services, with no services', () => {
    render(<ServicesBody services={[]} current={null} past={[]} updatedAt={NOW} now={NOW} />);
    expect(screen.getByText('No services yet')).toBeTruthy();
  });
  it('Customers, with no customers', () => {
    render(<Tooltip.Provider><CustomersView rows={[]} /></Tooltip.Provider>);
    expect(screen.getByText('No customers yet')).toBeTruthy();
  });
});
