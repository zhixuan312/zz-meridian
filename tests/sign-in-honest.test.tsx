import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The panels submit to server actions; a test of what the panels say has nothing to send.
vi.mock('../app/sign-in/actions', () => ({ demoSignIn: async () => ({ error: null }), signInAs: async () => ({}) }));

import * as panel from '../app/sign-in/panel';

const personas = [
  { id: 'members_1', name: 'Maya Chen', role: 'Owner', disabled: false },
  { id: 'members_12', name: 'Grace Liu', role: 'Viewer', disabled: false },
];
/** Words that frame the product as something else, or promise what nothing behind the page does. */
const UNKEPT = /\bdemo\b|sample data|free\b|inbox|sign-in link|identity provider|\bSSO\b|Terms|Privacy/i;

describe('the sign-in page', () => {
  it('offers only the ways in that sign somebody in: no email link and no company sign-in, which nothing sends or opens', () => {
    expect(Object.keys(panel)).not.toContain('SignInPanel');
    expect(Object.keys(panel).sort()).toEqual(['PanelFrame', 'PasswordPanel', 'PersonaPanel']);
  });

  it('asks who to sign in as, in the product\'s own words', () => {
    const { container } = render(<panel.PersonaPanel personas={personas} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Sign in as');
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([expect.stringContaining('Maya Chen'), expect.stringContaining('Grace Liu')]);
    expect(container.textContent).not.toMatch(UNKEPT);
  });

  it('asks for the password and the person where the product is behind one, and promises nothing else', () => {
    const { container } = render(<panel.PasswordPanel personas={personas} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Sign in');
    expect(screen.getByLabelText(/^Password/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(container.textContent).not.toMatch(UNKEPT);
  });
});
