import { render, act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Providers, usePreferences } from '@/components/base/providers';
import { STORAGE_KEY } from '@/lib/preferences';

/** A child that shows the choice, so the test reads what a person sees and not only the attribute. */
function ShowTheme() {
  const { prefs } = usePreferences();
  return <span data-testid="theme">{prefs.theme}</span>;
}

const write = (theme: string) => localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, accent: 'indigo', density: 'comfortable', assistant: true }));

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-accent');
  document.documentElement.removeAttribute('data-density');
});

describe('the appearance choices', () => {
  it('are read on mount and put on the root', () => {
    write('light');
    render(<Providers><ShowTheme /></Providers>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('follow another tab, so two tabs never disagree about the theme', () => {
    write('dark');
    const { getByTestId } = render(<Providers><ShowTheme /></Providers>);
    expect(getByTestId('theme').textContent).toBe('dark');

    // Another tab writes. The browser fires `storage` in this one, the tab that did NOT write.
    act(() => {
      write('light');
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    });
    expect(getByTestId('theme').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
