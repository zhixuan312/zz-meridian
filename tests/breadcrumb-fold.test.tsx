import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumb } from '@/components/ui/breadcrumb';

const open = () => {
  const trigger = screen.getByRole('button', { name: '2 more levels' });
  fireEvent.keyDown(trigger, { key: 'Enter' });
};

describe('a folded breadcrumb', () => {
  it('lists a level without an address as a name, not as a link to "#"', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Engineering', href: '/engineering' }, { label: 'Region' }, { label: 'Services', href: '/services' }, { label: 'api-gateway' }]} />);
    open();
    expect(screen.getByRole('menuitem', { name: 'Engineering' }).getAttribute('href')).toBe('/engineering');
    const region = screen.getByRole('menuitem', { name: 'Region' });
    expect(region.getAttribute('href')).toBeNull();
    expect(region.getAttribute('aria-disabled')).toBe('true');
    expect(document.querySelector('a[href="#"]')).toBeNull();
  });
});
