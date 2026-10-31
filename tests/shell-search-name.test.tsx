import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShellTools } from '@/components/patterns/shell-tools';

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
