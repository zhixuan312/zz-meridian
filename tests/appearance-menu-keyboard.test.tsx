import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Providers } from '@/components/base/providers';
import { AppearanceMenu } from '@/components/patterns/appearance-menu';
import { ACCENTS, STORAGE_KEY } from '@/lib/preferences';

beforeEach(() => localStorage.removeItem(STORAGE_KEY));

describe('appearance choices through the menu keyboard contract', () => {
  it('reaches and applies every accent using only the trigger, arrow keys and Enter', async () => {
    render(<Providers><AppearanceMenu /></Providers>);
    for (const accent of ACCENTS) {
      fireEvent.keyDown(screen.getByRole('button', { name: 'Appearance' }), { key: 'Enter' });
      await screen.findByRole('menu');
      await waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('menuitemradio'));
      for (let step = 0; step < 12 && document.activeElement?.getAttribute('aria-label') !== accent; step++) {
        await act(async () => {
          fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
      }
      expect(document.activeElement?.getAttribute('aria-label')).toBe(accent);
      fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
      expect(document.documentElement.getAttribute('data-accent')).toBe(accent);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).accent).toBe(accent);
    }
  });
});
