import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/cn';

/**
 * `cn` has to know Meridian's own scales, or a role and a utility look like two classes of one group and both survive.
 * The shadow scale needs no declaration — tailwind-merge groups every `shadow-*` already — so what is worth pinning is
 * the text scale, which it cannot guess: `text-sm` is a size and `text-ink-2` a colour, and a merge that took them for
 * one group would drop whichever came first.
 */
describe('the scales cn knows', () => {
  it('keeps a size and a role apart, in either order', () => {
    expect(cn('text-sm', 'text-ink-2')).toBe('text-sm text-ink-2');
    expect(cn('text-ink-2', 'text-sm')).toBe('text-ink-2 text-sm');
  });

  it('lets a later size replace an earlier one', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('lets a later shadow replace an earlier one without being told the names', () => {
    expect(cn('shadow-halo', 'shadow-card')).toBe('shadow-card');
  });
});
