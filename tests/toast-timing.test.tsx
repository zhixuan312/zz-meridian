import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster, toast, UNDO_MS } from '@/components/ui/toast';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

/** The stack the Toaster draws: the toasts' common parent. */
const stack = () => screen.getByText('Ana removed').closest('[role="status"]')!.parentElement!;

describe('a toast with an Undo', () => {
  it('waits while the pointer or focus is on it, and closes once, telling its owner, the window after it is left', () => {
    render(<Toaster />);
    const onClose = vi.fn();
    act(() => toast({ tone: 'neutral', title: 'Ana removed', action: { label: 'Undo', onClick: () => {} }, onClose }));
    fireEvent.pointerEnter(stack());
    act(() => { vi.advanceTimersByTime(UNDO_MS * 3); });
    expect(screen.getByText('Ana removed')).toBeTruthy();
    fireEvent.pointerLeave(stack());
    fireEvent.focus(screen.getByRole('button', { name: 'Undo' }));
    act(() => { vi.advanceTimersByTime(UNDO_MS * 3); });
    expect(screen.getByText('Ana removed')).toBeTruthy();
    fireEvent.blur(screen.getByRole('button', { name: 'Undo' }));
    act(() => { vi.advanceTimersByTime(UNDO_MS - 1); });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByText('Ana removed')).toBeNull();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('tells its owner when it closes on Undo, on Dismiss, or when newer toasts push it out', () => {
    render(<Toaster />);
    const closed: string[] = [];
    const raise = (title: string) => act(() => toast({ tone: 'neutral', title, action: { label: 'Undo', onClick: () => {} }, onClose: () => closed.push(title) }));
    raise('Ana removed');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    raise('Ben removed');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    for (const n of ['Cy', 'Di', 'Ed', 'Flo']) raise(`${n} removed`);
    expect(closed).toEqual(['Ana removed', 'Ben removed', 'Cy removed']);
  });

  it('keeps counting for the next toast after one left under the pointer, as pressing Undo does', () => {
    render(<Toaster />);
    for (const t of screen.queryAllByRole('button', { name: 'Dismiss' })) fireEvent.click(t);
    act(() => toast({ tone: 'neutral', title: 'Ana removed', action: { label: 'Undo', onClick: () => {} } }));
    fireEvent.pointerEnter(stack());
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    act(() => toast({ tone: 'positive', title: 'Saved' }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText('Saved')).toBeNull();
  });
});
