import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { Meridian, useMeridian } from '@/components/charts/meridian';

const week = (start: number) => Array.from({ length: 7 }, (_, i) => `2026-10-${String(start + i).padStart(2, '0')}`);
const thisWeek = week(1), lastWeek = week(8);

/**
 * A page's cursor belongs to a window of days, not to a count of them: a chart of last week beside a chart of this week
 * has the same seven days and no day in common.
 */
describe('the page cursor a chart joins', () => {
  it('is shared by a chart of the same days', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <Meridian dates={thisWeek}>{children}</Meridian>;
    const { result } = renderHook(() => useMeridian(thisWeek), { wrapper });
    expect(result.current.shared).toBe(true);
  });

  it('is not shared by a chart of a different week of the same length', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <Meridian dates={thisWeek}>{children}</Meridian>;
    const { result } = renderHook(() => useMeridian(lastWeek), { wrapper });
    expect(result.current.shared).toBe(false);
    expect(result.current.dates).toEqual(lastWeek);
  });
});
