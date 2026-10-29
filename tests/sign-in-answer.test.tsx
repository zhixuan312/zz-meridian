import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// What the password action answers, set by each test.
const answer = vi.hoisted(() => ({ value: { error: null } as { error: 'password' | 'persona' | null; persona?: string } }));
vi.mock('../app/sign-in/actions', () => ({ demoSignIn: async () => answer.value, signInAs: async () => ({}) }));

import { PasswordPanel } from '../app/sign-in/panel';

const personas = [
  { id: 'members_1', name: 'Maya Chen', role: 'Owner', disabled: false },
  { id: 'members_12', name: 'Grace Liu', role: 'Viewer', disabled: false },
];

/** Signs in as Grace with a password, and waits for the panel's answer. */
async function signIn() {
  render(<PasswordPanel personas={personas} />);
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'guess' } });
  fireEvent.change(screen.getByLabelText(/^Sign in as/), { target: { value: 'members_12' } });
  await act(async () => { fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!); });
}

describe('the password panel after a refused sign-in', () => {
  it('says the password was wrong and keeps the person chosen', async () => {
    answer.value = { error: 'password', persona: 'members_12' };
    await signIn();
    expect(screen.getByText('That is not the password.')).toBeTruthy();
    expect((screen.getByLabelText(/^Sign in as/) as HTMLSelectElement).value).toBe('members_12');
  });

  it('says the person cannot be signed in as, not that the password was wrong', async () => {
    answer.value = { error: 'persona' };
    await signIn();
    expect(screen.queryByText('That is not the password.')).toBeNull();
    expect(screen.getByText(/can't be signed in as right now/)).toBeTruthy();
  });
});
