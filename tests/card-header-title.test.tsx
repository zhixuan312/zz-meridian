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
});
