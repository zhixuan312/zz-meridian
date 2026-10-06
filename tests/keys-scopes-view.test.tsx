import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/keys', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

import { KeysView } from '@/views/keys';
import { API_KEYS } from '@/system/fixtures/sample-records';

describe('the Create key sheet', () => {
  it('will not create a key with no scope ticked', async () => {
    render(<KeysView rows={API_KEYS} now="2026-10-05T09:00:00.000Z" createKey={async () => API_KEYS[0]} revokeKey={async () => {}} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Create key' })[0]);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Messages' }));
    const create = screen.getAllByRole('button', { name: 'Create key' }).at(-1) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    expect(screen.getByText('Choose at least one scope.')).toBeTruthy();
  });
});
