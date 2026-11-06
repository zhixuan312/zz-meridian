import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/keys', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));

import { KeysView } from '@/views/keys';
import { hasSample } from './sample-present';

// The sheet is drawn over the sample's own keys; a product that replaced the sample has none, so the case is not
// applicable there rather than failing on an absent module (#131).
type Sample = typeof import('@/system/fixtures/sample-records');
const sample = hasSample()
  ? (await import(/* @vite-ignore */ new URL('../src/system/fixtures/sample-records.ts', import.meta.url).pathname)) as Sample
  : null;

describe.skipIf(!sample)('the Create key sheet', () => {
  it('will not create a key with no scope ticked', async () => {
    render(<KeysView rows={sample!.API_KEYS} now="2026-10-05T09:00:00.000Z" createKey={async () => ({ ok: true, key: { ...sample!.API_KEYS[0], secret: 'zzm_live_' + '0'.repeat(32) } })} revokeKey={async () => ({ ok: true })} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Create key' })[0]);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Messages' }));
    const create = screen.getAllByRole('button', { name: 'Create key' }).at(-1) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    expect(screen.getByText('Choose at least one scope.')).toBeTruthy();
  });
});
