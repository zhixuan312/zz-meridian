import { render, screen } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it } from 'vitest';
import { UsageBody } from '@/views/usage';
import { CustomersView } from '@/views/customers';
import { ServicesBody } from '@/views/services';
import { HomeBody } from '@/views/home';
import { homeData } from '@/logic/home-parts';

const totals = { requests: 0, errorRate: 0, p95: 0, revenue: 0 };
const NOW = '2026-10-05T09:00:00.000Z';
const runningDay = { date: '2026-10-04', requests: 8_561_561, errors: 0, p95: 0, tokens: 0, revenue: 0, revenueByPlan: { Starter: 0, Scale: 0, Enterprise: 0 } };

describe('a page body with no data shows its empty state, not a route error', () => {
  it('Home, with no complete day kept', () => {
    const { container } = render(<HomeBody {...homeData({ period: '30d', day: null, days: { series: [], previous: [], totals: { current: totals, previous: null }, running: null }, history: [], customers: [], usage: [], models: [], compute: [], services: [], incidents: [], releases: [], tickets: [], updatedAt: NOW, now: NOW })} />);
    expect(screen.getByText('No requests have arrived yet')).toBeTruthy();
    // Said once, and no figure drawn as if there were one: no revenue of $0, no tile, no chart.
    expect(container.querySelectorAll('h2')).toHaveLength(0);
    expect(container.textContent).not.toMatch(/\$0|Revenue ·|Customers/);
  });
  it('Home, with no complete day but traffic in the day in progress, says so', () => {
    const { container } = render(<HomeBody {...homeData({ period: '30d', day: null, days: { series: [], previous: [], totals: { current: totals, previous: null }, running: runningDay }, history: [], customers: [], usage: [], models: [], compute: [], services: [], incidents: [], releases: [], tickets: [], updatedAt: NOW, now: NOW })} />);
    expect(screen.getByText('Today is still in progress')).toBeTruthy();
    expect(container.textContent).toMatch(/8\.6M requests so far/);
    expect(container.textContent).not.toMatch(/No requests have arrived yet/);
  });

  it('Home draws no compute figure when no complete day holds a compute row', () => {
    const data = homeData({ period: '30d', day: null, days: { series: [runningDay], previous: [], totals: { current: { ...totals, requests: runningDay.requests }, previous: null }, running: null }, history: [], customers: [], usage: [], models: [], compute: [], services: [], incidents: [], releases: [], tickets: [], updatedAt: NOW, now: NOW });
    expect(data.compute).toBeNull();
  });

  it('Usage, with no complete day but traffic in the day in progress, says so', () => {
    render(<UsageBody period="30d" day={null} head={{ title: null, facts: [] }} record={null} line={null} days={{ series: [], totals: { current: totals, previous: null }, running: runningDay }} calendar={{ days: [], running: true, busiest: null }} figures={null} endpoints={[]} responses={[]} unread={[]} updatedAt={NOW} now={NOW} />);
    expect(screen.getByText('Today is still in progress')).toBeTruthy();
    expect(screen.queryByText('No requests have arrived yet')).toBeNull();
  });

  it('Usage names no busiest hour when every hour is zero', () => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: `${String(h).padStart(2, '0')}:00`, value: 0 }));
    const figures = { heat: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)), hours, regions: [] };
    render(<UsageBody period="30d" day={null} head={{ title: null, facts: [] }} record={null} line={null} days={{ series: [runningDay], totals: { current: { ...totals, requests: runningDay.requests }, previous: null }, running: null }} calendar={{ days: [], running: false, busiest: null }} figures={figures} endpoints={[]} responses={[]} unread={[]} updatedAt={NOW} now={NOW} />);
    expect(screen.queryByText(/The busiest hour is/)).toBeNull();
    expect(screen.getByText(/No request was counted by hour/)).toBeTruthy();
  });

  it('Usage, with no complete day kept', () => {
    const { container } = render(<UsageBody period="30d" day={null} head={{ title: null, facts: [] }} record={null} line={null} days={{ series: [], totals: { current: totals, previous: null }, running: null }} calendar={{ days: [], running: false, busiest: null }} figures={null} endpoints={[]} responses={[]} unread={[]} updatedAt={NOW} now={NOW} />);
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
