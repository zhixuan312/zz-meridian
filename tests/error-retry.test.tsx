import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { Tooltip } from 'radix-ui';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import DashboardError from '../app/(dashboard)/error';
import EmbedError from '../app/embed/error';

// A page fails when its server read did not arrive, so a retry must fetch again: Next's `retry` refreshes the router
// and re-renders, while `reset` re-renders the cached payload, which holds the same error.
describe('an error screen retries by fetching again', () => {
  const error = Object.assign(new Error('read failed'), { digest: 'd1' });

  test('the dashboard error calls retry', () => {
    const retry = vi.fn();
    render(<Tooltip.Provider><DashboardError error={error} retry={retry} /></Tooltip.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  test('the embed error calls retry', () => {
    const retry = vi.fn();
    render(<EmbedError error={error} retry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
