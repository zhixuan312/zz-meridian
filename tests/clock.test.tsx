import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Freshness } from '@/components/patterns/freshness';
import { AlertsPanel, ShellTools } from '@/components/patterns/shell-tools';
import { formatRelative } from '@/lib/format-date';

const now = new Date('2026-10-05T09:00:00Z');

describe('the clock is always the caller’s', () => {
  it('formats relative to the now it is given', () => {
    expect(formatRelative(new Date('2026-10-05T08:55:00Z'), now)).toBe('5 min ago');
    expect(formatRelative(new Date('2026-10-05T08:55:00Z'), new Date('2026-10-05T11:55:00Z'))).toBe('3 h ago');
  });
  it('renders freshness against the given now', () => {
    render(<Freshness updatedAt={new Date('2026-10-05T08:58:00Z')} now={now} />);
    expect(screen.getByText(/Updated 2 min ago/)).toBeTruthy();
  });
  it('does not compile without one', () => {
    const at = new Date('2026-10-05T08:55:00Z');
    // @ts-expect-error formatRelative takes the caller's now
    const r = () => formatRelative(at);
    // @ts-expect-error Freshness takes the caller's now
    const f = <Freshness updatedAt={at} />;
    // @ts-expect-error ShellTools takes the caller's now
    const s = <ShellTools alerts={[]} />;
    // @ts-expect-error AlertsPanel takes the caller's now
    const a = <AlertsPanel alerts={[]} />;
    expect([r, f, s, a]).toHaveLength(4);
  });
});
