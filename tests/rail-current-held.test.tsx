import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/audit',
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { Home, Shield } from 'lucide-react';
import { Rail } from '@/components/patterns/rail';
import { ConsoleRail } from '@/views/console-chrome';

const admin = { label: 'Admin', items: [{ href: '/', label: 'Home', icon: Home, needs: 'public' as const }, { href: '/admin', label: 'Admin', icon: Shield, needs: 'public' as const }] };
const audit = { href: '/admin/audit', label: 'Audit', icon: Shield, needs: 'public' as const };
const lit = () => document.querySelector('a[aria-current="page"]');

describe('the rail at an address under a destination the person does not hold (#62)', () => {
  it('lights nothing when the longest declared destination is one their rail does not hold', () => {
    render(<Rail nav={[admin]} declared={['/', '/admin', '/admin/audit']} user={null} />);
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    expect(lit()).toBeNull();
  });
  it('still lights the destination they hold that the address sits under', () => {
    render(<Rail nav={[{ ...admin, items: [...admin.items, audit] }]} declared={['/', '/admin', '/admin/audit']} user={null} current="/admin/audit/42" />);
    expect(lit()).toHaveTextContent('Audit');
  });
  it('is given every destination the console declares, so the filtered rail lights nothing there', () => {
    render(<ConsoleRail nav={[{ ...admin, items: [...admin.items, audit] }]} access={{ only: ['/', '/admin'], user: { name: 'Ada', role: 'Member' } }} />);
    expect(screen.queryByRole('link', { name: 'Audit' })).toBeNull();
    expect(lit()).toBeNull();
  });
});
