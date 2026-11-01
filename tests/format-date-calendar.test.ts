import { describe, expect, it, vi } from 'vitest';

// A product west of UTC: a day read as the instant of its midnight in UTC prints as the day before.
vi.mock('@/app.config', async (original) => {
  const actual = await original<typeof import('@/app.config')>();
  return { ...actual, app: { ...actual.app, timezone: 'America/Los_Angeles' } };
});

import { formatCalendarDate, formatCalendarMonth, formatDate, formatDateTime, formatDay, formatShortDate } from '@/lib/format-date';

describe('a day written without a time, in a product west of UTC', () => {
  it('prints as the day it names in every day formatter', () => {
    expect(formatDate('2026-10-01')).toBe('01 Oct 2026');
    expect(formatShortDate('2026-10-01')).toBe('01 Oct');
    expect(formatDay('2026-10-01')).toBe('1 Oct');
  });

  it('an instant still prints in the reporting timezone', () => {
    expect(formatDate('2026-10-01T03:00:00Z')).toBe('30 Sept 2026');
    expect(formatDay(Date.UTC(2026, 9, 1, 3))).toBe('30 Sept');
    expect(formatDateTime('2026-10-01T03:00:00Z')).toBe('30 Sept 2026, 20:00');
  });

  it('keeps an impossible calendar date visible rather than silently naming another day', () => {
    for (const date of ['2026-02-30', '2025-02-29', '2026-04-31', '2026-00-10', '2026-13-01', '2026-01-00']) {
      for (const format of [formatDate, formatDay, formatShortDate, formatCalendarDate, formatCalendarMonth]) expect(format(date), date).toBe(date);
    }
  });

  it('preserves valid leap days and the literal year below 100', () => {
    expect(formatDate('2024-02-29')).toBe('29 Feb 2024');
    expect(formatCalendarDate('0099-01-01')).toBe('Thu 1 Jan 99');
    expect(formatDate('0099-01-01')).toBe('01 Jan 99');
  });
});
