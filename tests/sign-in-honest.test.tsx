import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The panels submit to server actions; a test of what the panels say has nothing to send.
vi.mock('../app/sign-in/actions', () => ({ demoSignIn: async () => ({ error: null }), signInAs: async () => ({}) }));

import * as panel from '../app/sign-in/panel';

const personas = [
  { id: 'members_1', name: 'Maya Chen', role: 'Owner', disabled: false },
  { id: 'members_12', name: 'Grace Liu', role: 'Viewer', disabled: false },
];

describe('the sign-in page', () => {
  it('defaults the password form to the first active person', () => {
    render(<panel.PasswordPanel personas={[{ ...personas[0], disabled: true }, personas[1]]} />);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe(personas[1].id);
  });

  it('asks who to sign in as, in the product\'s own words', () => {
    render(<panel.PersonaPanel personas={personas} />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([expect.stringContaining('Maya Chen'), expect.stringContaining('Grace Liu')]);
  });

  it('asks for the password and the person where the product is behind one, and promises nothing else', () => {
    render(<panel.PasswordPanel personas={personas} />);
    expect(screen.getByLabelText(/^Password/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it.each([
    ['open', panel.PersonaPanel],
    ['password', panel.PasswordPanel],
  ] as const)('explains an unavailable roster instead of offering an unusable %s sign-in', (_name, Panel) => {
    for (const unavailable of [[], personas.map((one) => ({ ...one, disabled: true }))]) {
      const view = render(<Panel personas={unavailable} />);
      expect(screen.getByRole('status', { name: /sign.in.*unavailable/i })).toBeTruthy();
      expect(view.container.querySelector('form')).toBeNull();
      expect(screen.queryByRole('combobox')).toBeNull();
      expect(screen.queryByLabelText(/^Password/)).toBeNull();
      view.unmount();
    }
  });
});
