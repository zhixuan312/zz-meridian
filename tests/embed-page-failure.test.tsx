import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/embed/now', useRouter: () => ({ refresh() {}, push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() }));
// The read is the tool's, and here it is the thing that fails.
vi.mock('@/logic/tools', () => ({ nowTool: { read: async () => { throw new Error('the backend did not answer'); } } }));

import { app } from '@/app.config';
import Page from '../app/embed/now/page';

describe('an embed whose read threw', () => {
  it('keeps the frame and says so, rather than leaving the host an empty rectangle', async () => {
    await act(async () => { render(<Page />); });
    // The frame: the view's name and the way to the console are the host's only bearings.
    expect(await screen.findByRole('heading', { name: 'Now' })).toBeTruthy();
    // The frame's own way out, which is the only control the failure has: the read is the tool's, so there is no Retry
    // and the host asks again by asking the tool again.
    // The product's own name, read from the configuration: the template's name is not the project's, and a test that
    // wrote it here would pass in this repository and fail in every dashboard created from it.
    expect(app.name).not.toBe('');
    expect(screen.getByRole('button', { name: /Open/ }).textContent).toBe(`Open in ${app.name}`);
    expect(screen.getByText('Now did not load')).toBeTruthy();
    expect(screen.getByText(/did not arrive, and nothing was changed/)).toBeTruthy();
  });
});
