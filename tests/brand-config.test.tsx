import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app.config', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/app.config')>();
  return { ...real, app: { ...real.app, accent: 'brand', theme: 'dark', logo: '/logo.svg' } };
});

import { AppMark } from '@/components/base/app-mark';
import { Providers } from '@/components/base/providers';
import { ACCENTS, PREPAINT } from '@/lib/preferences';

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('branding from the app configuration', () => {
  it('recognizes the configured custom accent', () => {
    for (const a of ['indigo', 'cobalt', 'jade', 'graphite', 'brand']) expect(ACCENTS).toContain(a);
  });
  it('applies the configured theme before paint when nothing is stored', () => {
    new Function(PREPAINT)();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
  it('starts Providers on the configured theme when nothing is stored', () => {
    render(<Providers><span /></Providers>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('AppMark with a logo', () => {
  for (const size of [20, 24, 28, 32] as const) {
    it(`renders the local SVG at ${size}px, decorative beside the name`, () => {
      const { container } = render(<AppMark size={size} />);
      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).toBe('/logo.svg');
      expect(img?.getAttribute('width')).toBe(String(size));
      expect(img?.getAttribute('height')).toBe(String(size));
      expect(img?.getAttribute('alt')).toBe('');
    });
  }
  it('names itself when it stands alone', () => {
    const { container } = render(<AppMark size={32} label="Acme Ops" />);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('Acme Ops');
  });
});
