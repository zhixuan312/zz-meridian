import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';

describe('a busy button', () => {
  it('keeps the focus it had when something other than its press makes it busy (#58)', () => {
    let set: (b: boolean) => void = () => {};
    function Retry() { const [busy, setBusy] = useState(false); set = setBusy; return <Button busy={busy}>Retry</Button>; }
    render(<Retry />);
    const button = screen.getByRole('button', { name: 'Retry' });
    button.focus();
    act(() => set(true));
    expect(document.activeElement).toBe(button);
    expect(button).not.toHaveAttribute('disabled');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
  it('ignores a press while busy, and takes one again once it is not', () => {
    const onClick = vi.fn();
    const view = render(<Button busy onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).not.toHaveBeenCalled();
    view.rerender(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it('does not submit its form while busy', () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(<form onSubmit={onSubmit}><Button type="submit" busy>Send</Button></form>);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it('is still disabled when it is disabled', () => {
    render(<Button disabled busy>Send</Button>);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
