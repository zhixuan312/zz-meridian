import { act, render, screen } from '@testing-library/react';
import type { ComponentType, ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const asset = vi.hoisted(() => ({ current: Promise.withResolvers<{ default: ComponentType }>() }));
// App Router dynamic previews use React.lazy under the stage's Suspense boundary.
vi.mock('@/system/registry', async () => {
  const { lazy } = await import('react');
  return { CARDS: [{ section: 'components', id: 'badge', Preview: lazy(() => asset.current.promise) }] };
});
vi.mock('@/system/preview-loaders', () => ({ PREVIEW_LOADERS: { 'components/badge': () => asset.current.promise } }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

import { CardStage } from '@/system/card-stage';
import { PreviewStage } from '../app/system/preview/[section]/[card]/stage';
import { Providers } from '@/components/base/providers';

beforeEach(() => {
  asset.current = Promise.withResolvers<{ default: ComponentType }>();
  vi.stubGlobal('matchMedia', (media: string) => ({ matches: false, media, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());

async function loads(stage: ReactElement) {
  render(<Providers>{stage}</Providers>);
  const pending = await screen.findByRole('status', { name: 'Loading preview' });
  expect(pending.getAttribute('aria-busy')).toBe('true');
  await act(async () => { asset.current.resolve({ default: () => <button>Specimen action</button> }); });
  await screen.findByRole('button', { name: 'Specimen action' });
  expect(screen.queryByRole('status', { name: 'Loading preview' })).toBeNull();
}

describe('a preview whose code is still arriving', () => {
  it('keeps a named loading state in the card stage until its action is usable', async () => {
    await loads(<CardStage id="components/badge" />);
  });
  it('does the same in the standalone preview', async () => {
    await loads(<PreviewStage id="components/badge" />);
  });
});
