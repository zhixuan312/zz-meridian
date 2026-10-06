import { render, screen } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it } from 'vitest';
import { AnalyticsBody } from '@/views/analytics';
import { CustomersView } from '@/views/customers';
import { HealthBody } from '@/views/health';
import { OverviewBody } from '@/views/overview';

const totals = { requests: 0, errorRate: 0, p95: 0, spend: 0 };
const NOW = '2026-10-05T09:00:00.000Z';

describe('a page body with no data shows its empty state, not a route error', () => {
  it('Overview, with no requests', () => {
    render(<OverviewBody series={[]} totals={{ current: totals, previous: totals }} endpoints={[]} mix={[]} activity={[]} now={NOW} />);
    expect(screen.getByText('No requests yet')).toBeTruthy();
  });
  it('Analytics, with no requests in the period', () => {
    render(<AnalyticsBody series={[]} heat={[]} hours={[]} regions={[]} endpoints={[]} />);
    expect(screen.getByText('No requests in this period')).toBeTruthy();
  });
  it('Health, with no services', () => {
    render(<HealthBody services={[]} current={null} past={[]} now={NOW} />);
    expect(screen.getByText('No services yet')).toBeTruthy();
  });
  it('Customers, with no customers', () => {
    render(<Tooltip.Provider><CustomersView rows={[]} /></Tooltip.Provider>);
    expect(screen.getByText('No customers yet')).toBeTruthy();
  });
});
