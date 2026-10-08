import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { State } from '@/system/specimen';

describe('State still', () => {
  it('holds a depicted state in an inert container and keeps its caption visible', () => {
    render(<State label="Focus" still><button type="button">Save</button></State>);
    const button = screen.getByRole('button', { hidden: true });
    const holder = button.closest('[inert]');
    expect(holder).not.toBeNull();
    expect(holder?.hasAttribute('inert')).toBe(true);
    const caption = screen.getByText('Focus');
    expect(caption.closest('[inert]')).toBeNull();
  });

  it('renders a live state as before, with no inert container', () => {
    const { container } = render(<State label="Rest"><button type="button">Save</button></State>);
    expect(container.querySelector('[inert]')).toBeNull();
    expect(screen.getByRole('button').closest('figure')).toBe(container.querySelector('figure'));
    expect(screen.getByText('Rest')).toBeTruthy();
  });
});
