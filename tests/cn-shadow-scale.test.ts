import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/cn';

/**
 * `cn` has to know Meridian's own scales, or a utility and a role look like two different groups and both survive. The
 * shadow scale is the one a caller overrides on an element: a card's shadow, raised to the overlay's.
 */
describe('the shadow scale cn knows', () => {
  it('lets a later shadow replace an earlier one, for every shadow the theme defines', () => {
    for (const name of ['card', 'raise', 'overlay', 'control', 'accent', 'halo']) {
      expect(cn(`shadow-${name}`, 'shadow-card'), name).toBe('shadow-card');
    }
  });
});
