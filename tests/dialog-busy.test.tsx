// While an action is on its way, a dialog must not be dismissed. Cancel, Escape and the scrim closed it anyway, the
// request was already sent, so it finished unseen — and on Tickets and API keys the person could press again and make a
// second record. Measured on the 0.39.8 build: `src/views/tickets.tsx:249`, `src/views/keys.tsx:171`,
// `src/views/members.tsx:312,336`.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const escape = () => fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
const outside = () => fireEvent.pointerDown(document.body);

describe('a dialog whose action is in flight', () => {
  it('is not closed by Escape while it is busy, and is once the action answers', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Dialog open onOpenChange={onOpenChange}><DialogContent title="Create a key" busy>Working</DialogContent></Dialog>);
    escape();
    expect(onOpenChange).not.toHaveBeenCalled();
    rerender(<Dialog open onOpenChange={onOpenChange}><DialogContent title="Create a key">Done</DialogContent></Dialog>);
    escape();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('is not closed by a press outside it while it is busy', () => {
    const onOpenChange = vi.fn();
    render(<Dialog open onOpenChange={onOpenChange}><DialogContent title="Create a key" busy>Working</DialogContent></Dialog>);
    outside();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('says it is busy, and says nothing when it is not', () => {
    const { rerender } = render(<Dialog open><DialogContent title="Create a key" busy>Working</DialogContent></Dialog>);
    expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
    rerender(<Dialog open><DialogContent title="Create a key">Done</DialogContent></Dialog>);
    expect(screen.getByRole('dialog').hasAttribute('aria-busy')).toBe(false);
  });

  it('does not let its own close button dismiss it while busy', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Dialog open onOpenChange={onOpenChange}><DialogContent title="Create a key" busy>Working</DialogContent></Dialog>);
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close).toBeDisabled();
    fireEvent.click(close);
    expect(onOpenChange).not.toHaveBeenCalled();
    rerender(<Dialog open onOpenChange={onOpenChange}><DialogContent title="Create a key">Done</DialogContent></Dialog>);
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('still lets a caller close it, which is the one way it is dismissed while busy', () => {
    const onOpenChange = vi.fn();
    render(<Dialog open onOpenChange={onOpenChange}><DialogContent title="Create a key" busy footer={<DialogClose>Dismiss</DialogClose>}>Working</DialogContent></Dialog>);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('a sheet whose action is in flight', () => {
  it('is not closed by Escape or a press outside while it is busy', () => {
    const onOpenChange = vi.fn();
    render(<Sheet open onOpenChange={onOpenChange}><SheetContent title="Invite a member" busy>Sending</SheetContent></Sheet>);
    escape();
    outside();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
  });
});
