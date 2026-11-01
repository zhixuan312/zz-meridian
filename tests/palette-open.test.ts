import { afterEach, describe, expect, it, vi } from 'vitest';
import { openCommand, registerOpener } from '@/components/patterns/command-palette/open';

/** The palette is its own chunk, so a press can land before it has mounted; that press still opens it. */
describe('openCommand', () => {
  afterEach(() => registerOpener(null));

  it('opens a palette that has mounted', () => {
    const open = vi.fn();
    registerOpener(open);
    openCommand();
    expect(open).toHaveBeenCalledOnce();
  });

  it('keeps a press made before the palette mounted, and opens it once it does', () => {
    openCommand();
    const open = vi.fn();
    registerOpener(open);
    expect(open).toHaveBeenCalledOnce();
    registerOpener(null);
    registerOpener(open);
    expect(open).toHaveBeenCalledOnce();
  });
});
