import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DashboardError from '../app/(dashboard)/error';

// A client render error has no digest. The screen used to print the literal "client" as the support reference, so the
// person quoted a reference support could not trace.
describe('the dashboard error screen', () => {
  it('omits the reference when the error carries no digest', () => {
    const { container } = render(<DashboardError error={new Error('render failed')} retry={() => {}} />);
    expect(container.textContent).not.toMatch(/Reference/);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('names the digest when there is one', () => {
    const error = Object.assign(new Error('server failed'), { digest: '1234567890' });
    const { container } = render(<DashboardError error={error} retry={() => {}} />);
    expect(container.textContent).toMatch(/Reference\s*1234567890/);
  });
});
