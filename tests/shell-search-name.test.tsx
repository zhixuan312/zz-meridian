import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShellTools } from '@/components/patterns/shell-tools';

// Below 40rem the button draws only its icon; the word stays in the DOM as its name. `display: none` on the only text
// left an icon-only button with no accessible name, which axe reported on every view at 390px (#83).
describe('the shell\'s Search button at a phone width (#83)', () => {
  it('keeps "Search" as its name, visually hidden rather than removed', () => {
    render(<ShellTools alerts={[]} now={new Date('2026-10-05T09:00:00Z')} />);
    // The name is "Search ⌘K": the shortcut is drawn beside the word, which is what keeps the icon-only state named.
    const button = screen.getAllByRole('button', { name: /Search/ })[0];
    const word = [...button.querySelectorAll('span')].find((s) => s.textContent === 'Search')!;
    expect(word.className).toContain('@max-[40rem]:sr-only');
    expect(word.className).not.toContain('@max-[40rem]:hidden');
  });
});
