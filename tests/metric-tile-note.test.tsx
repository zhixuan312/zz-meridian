import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricTile } from '@/components/patterns/metric-tile';

/**
 * A tile's note is words a person reads whole ("296 active · 14 trials · 10 past due"). In a narrow column, as a third of
 * the page with the assistant's panel open, one line cut it to "10 past …". It takes a second
 * line before it is cut, and keeps the whole of itself in its title. A tile's change and its comparison keep their one
 * line, which hides a part that does not fit whole.
 */
const NOTE = '296 active · 14 trials · 10 past due';
const noteOf = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('span')].find((s) => s.textContent === NOTE)!;

describe("a tile's note", () => {
  it('wraps to a second line before it is cut, and is never cut to one', () => {
    const { container } = render(<MetricTile label="Customers" value={320} note={NOTE} />);
    const note = noteOf(container);
    expect(note.className).toContain('line-clamp-2');
    expect(note.className).not.toMatch(/(^|\s)truncate(\s|$)/);
    expect(note.parentElement!.className).not.toMatch(/(^|\s)h-5(\s|$)/);
    expect(note).toHaveAttribute('title', NOTE);
  });

  it('a change keeps its one line', () => {
    const { container } = render(<MetricTile label="Requests" value={42} delta={0.1} compare="vs the 30 days before" />);
    expect(container.querySelector('[data-tile-line]')!.className).toMatch(/(^|\s)h-5(\s|$)/);
  });
});
