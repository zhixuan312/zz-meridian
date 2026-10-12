import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Toaster, toast } from '@/components/ui/toast';

// A toast's own role is its announcement: `status` is a polite live region and `alert` an assertive one. A live region
// around them announces every message a second time, and a critical one both politely and assertively (issue #23).
describe('a toast is announced once', () => {
  it('sits in no live region of the stack', () => {
    render(<Toaster />);
    act(() => { toast({ tone: 'positive', title: 'Workspace saved' }); });
    act(() => { toast({ tone: 'critical', title: 'Not saved' }); });
    expect(screen.getByRole('status').closest('[aria-live]')).toBeNull();
    expect(screen.getByRole('alert').closest('[aria-live]')).toBeNull();
  });
});
