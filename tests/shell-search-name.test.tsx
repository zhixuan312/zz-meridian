import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

// The palette opens on ⌘K or Ctrl K; a reader on Windows or Linux was shown a key their keyboard does not have.
describe("the palette's key, as the reader's keyboard names it", () => {
  afterEach(() => vi.unstubAllGlobals());
  const shown = () => {
    render(<ShellTools alerts={[]} now={new Date('2026-10-05T09:00:00Z')} />);
    return screen.getAllByRole('button', { name: /Search/ })[0].querySelector('kbd')?.textContent;
  };
  it('reads Ctrl K off an Apple keyboard', () => {
    vi.stubGlobal('navigator', { ...navigator, platform: 'Win32', userAgentData: undefined });
    expect(shown()).toBe('Ctrl K');
  });
  it('reads ⌘K on one', () => {
    vi.stubGlobal('navigator', { ...navigator, platform: 'MacIntel', userAgentData: undefined });
    expect(shown()).toBe('⌘K');
  });
});
