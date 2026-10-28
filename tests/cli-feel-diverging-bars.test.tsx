// Named cli-* so the payload leaves it out: it reads the Diverging bars' own preview, which a product may not keep.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 480, height: 0 }] as const };
});

import DivergingBarsPreview from '@/components/charts/diverging-bars/preview';

// I-14 finding 5: every state the README names is drawn statically and labelled: Hover, Hover on a linked label, Focus
// on a linked row, and a chart whose every row is no data or zero.

/** The chart a state draws, found by the state's caption. */
const state = (caption: string) => screen.getByText(caption, { selector: 'figcaption' }).closest('figure')!;

describe('the Diverging bars\' specimens', () => {
  it('draw hover, a linked label hovered and a linked row focused, each labelled and held still', () => {
    render(<DivergingBarsPreview />);
    for (const caption of ['Hover: the row\'s bar steps up', 'Hover on a linked label: the label takes accent-ink', 'Focus on a linked row: the link\'s ring']) {
      const s = state(caption);
      expect(s.querySelector('[inert]'), caption).not.toBeNull();
      expect(s.querySelector('[data-row]'), caption).not.toBeNull();
    }
    expect(state('Hover on a linked label: the label takes accent-ink').querySelector('[data-row] a')).not.toBeNull();
    expect(state('Focus on a linked row: the link\'s ring').querySelector('[data-row] a')).not.toBeNull();
  });

  it('draw a chart whose every row is no data or zero: no bars, and the axis on the levels of ±1', () => {
    render(<DivergingBarsPreview />);
    const s = state('All no data or zero');
    expect(s.querySelectorAll('[data-row]').length).toBeGreaterThan(1);
    expect(s.querySelector('[data-bar]')).toBeNull();
    const levels = [...s.querySelectorAll('[data-level]')].map((e) => e.textContent);
    expect([levels[0], levels.at(-1)]).toEqual(['−1.0', '+1.0']);
  });
});
