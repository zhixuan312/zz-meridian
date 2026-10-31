import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/embed/now', useRouter: () => ({ refresh() {}, push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() }));
// The read is the tool's, and here it is the thing that fails.
vi.mock('@/logic/tools', () => ({ nowTool: { read: async () => { throw new Error('the backend did not answer'); } } }));

import Page from '../app/embed/now/page';

describe('an embed whose read threw', () => {
  it('keeps the frame and says so, rather than leaving the host an empty rectangle', async () => {
    await act(async () => { render(<Page />); });
    // The frame keeps the view's name visible when its read fails.
    expect(await screen.findByRole('heading', { name: 'Now' })).toBeTruthy();
    expect(screen.getByText('Now did not load')).toBeTruthy();
    expect(screen.getByText(/did not arrive, and nothing was changed/)).toBeTruthy();
  });
});
