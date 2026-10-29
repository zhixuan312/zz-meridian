import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';

describe('Dialog focus on open', () => {
  it('starts at the first field, though the close button comes first in the panel', () => {
    render(<Dialog open><DialogContent title="Create a key"><input aria-label="Name" /></DialogContent></Dialog>);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' }));
  });

  it('starts at the close button when the dialog has no field', () => {
    render(<Dialog open><DialogContent title="Revoke this key?" description="Requests signed with it fail at once.">Nothing to fill in</DialogContent></Dialog>);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  });

  it('leaves focus to a caller that places it itself', () => {
    render(<Dialog open><DialogContent title="Create a key" onOpenAutoFocus={(e) => e.preventDefault()}><input aria-label="Name" /></DialogContent></Dialog>);
    expect(document.activeElement).not.toBe(screen.getByRole('textbox', { name: 'Name' }));
  });
});

describe('a panel without a description', () => {
  it('is described by nothing, rather than by its own title read twice', () => {
    render(<Dialog open><DialogContent title="Evidence">Six readings</DialogContent></Dialog>);
    expect(screen.getByRole('dialog').getAttribute('aria-describedby')).toBeNull();
  });

  it('is described by nothing, in a sheet too', () => {
    render(<Sheet open><SheetContent title="POST /v1/messages">Body</SheetContent></Sheet>);
    expect(screen.getByRole('dialog').getAttribute('aria-describedby')).toBeNull();
  });
});
