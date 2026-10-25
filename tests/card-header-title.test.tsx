import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardHeader } from '@/components/ui/card';

/**
 * A card's heading is cut with an ellipsis where it has no room, unless it is told to wrap; a cut heading carries its
 * whole text as its title, so a pointer reads it and the audit finds it held (issue #33).
 */
describe("a card heading's whole text", () => {
  it('is its title when the heading may be cut', () => {
    const { container } = render(<CardHeader title="Requests by region, the last 30 complete days" />);
    expect(container.querySelector('h2')!.getAttribute('title')).toBe('Requests by region, the last 30 complete days');
  });

  it('is not repeated as a title when the heading wraps instead', () => {
    const { container } = render(<CardHeader title="Requests by region" wrap />);
    expect(container.querySelector('h2')!.hasAttribute('title')).toBe(false);
  });

  it('is not invented for a heading that is not plain text', () => {
    const { container } = render(<CardHeader title={<span>Requests <em>by region</em></span>} />);
    expect(container.querySelector('h2')!.hasAttribute('title')).toBe(false);
  });

  // A head that cannot hold a word of its title beside its actions puts the actions on their own line instead (#87).
  // jsdom lays nothing out, so what it can hold is the rule: the row wraps, the title's box has a floor, and the
  // actions never shrink. `scripts/audit.ts` at 1024px is what shows the heading inside its box.
  it('wraps its actions below the title when the two cannot share a line', () => {
    const { container } = render(<CardHeader title="Revenue by plan" wrap actions={<button>Export</button>} />);
    const head = container.firstElementChild!;
    expect(head.className).toMatch(/\bflex-wrap\b/);
    const [title, actions] = [...head.children];
    expect(title.className).toMatch(/\bmin-w-32\b/);
    expect(title.className).toMatch(/\bflex-1\b/);
    expect(actions.className).toMatch(/\bshrink-0\b/);
    // A title that wraps breaks a word too long for the line rather than drawing it over what is beside it.
    expect(container.querySelector('h2')!.className).toMatch(/\[overflow-wrap:anywhere\]/);
  });
});
