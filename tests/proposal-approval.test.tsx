import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Proposal } from '@/components/patterns/proposal';

const changes = [{ label: 'Limit', from: '100 rpm', to: '200 rpm' }];

describe('Proposal approval ownership', () => {
  it('rejects a missing uncontrolled handler in types and never reports success to an untyped consumer', async () => {
    // @ts-expect-error uncontrolled approval requires an action, unlike a controlled display state
    render(<Proposal title="Raise the limit" changes={changes} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.queryByText('Applied', { exact: true })).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });

  it('accepts a synchronous action and reports success only after running it', async () => {
    const approve = vi.fn(() => {});
    render(<Proposal title="Raise the limit" changes={changes} onApprove={approve} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(approve).toHaveBeenCalledOnce();
    expect(await screen.findByText('Applied', { exact: true })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
  });

  it('allows a controlled settled proposal without a runnable action', () => {
    render(<Proposal title="Raise the limit" changes={changes} state="applied" />);
    expect(screen.getByText('Applied', { exact: true })).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
