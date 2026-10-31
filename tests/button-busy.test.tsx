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

describe('a blocked button child', () => {
  it('cancels a disabled link and removes it from keyboard navigation', () => {
    render(<Button asChild disabled><a href="#unavailable" tabIndex={0}>Unavailable</a></Button>);
    const link = screen.getByRole('link', { name: 'Unavailable' });
    expect(fireEvent.click(link)).toBe(false);
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link.tabIndex).toBe(-1);
  });

  it.each(['disabled', 'busy'] as const)('blocks child and button click handlers while %s, then enables them again', (state) => {
    const handlers = {
      button: vi.fn((event: { preventDefault(): void }) => event.preventDefault()),
      child: vi.fn(), buttonCapture: vi.fn(), childCapture: vi.fn(),
    };
    const content = (blocked: boolean) => (
      <Button asChild disabled={state === 'disabled' && blocked} busy={state === 'busy' && blocked}
        onClick={handlers.button} onClickCapture={handlers.buttonCapture}>
        <a href="#action" tabIndex={0} aria-disabled={false} aria-busy={false}
          onClick={handlers.child} onClickCapture={handlers.childCapture}>Action</a>
      </Button>
    );
    const view = render(content(true));
    const link = screen.getByRole('link', { name: 'Action' });
    expect(fireEvent.click(link)).toBe(false);
    for (const handler of Object.values(handlers)) expect(handler).not.toHaveBeenCalled();
    expect(link).toHaveAttribute('aria-disabled', 'true');
    if (state === 'busy') {
      link.focus();
      expect(document.activeElement).toBe(link);
      expect(link.tabIndex).toBe(0);
      expect(link).toHaveAttribute('aria-busy', 'true');
    }
    view.rerender(content(false));
    fireEvent.click(screen.getByRole('link', { name: 'Action' }));
    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledTimes(1);
  });

  it('blocks a busy native button before a nested child can start an action', () => {
    const child = vi.fn();
    render(<Button busy><span onClick={child}>Nested action</span></Button>);
    fireEvent.click(screen.getByText('Nested action'));
    expect(child).not.toHaveBeenCalled();
  });
});
