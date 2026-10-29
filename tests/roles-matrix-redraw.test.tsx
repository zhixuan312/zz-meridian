import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/** Every tick the matrix works out asks `whoCan`; counted here, so a redraw of the matrix shows as more calls. */
const asked = vi.hoisted(() => ({ count: 0 }));
vi.mock('@/data/roles', async (orig) => {
  const real = await orig<typeof import('@/data/roles')>();
  return { ...real, whoCan: (...args: Parameters<typeof real.whoCan>) => { asked.count++; return real.whoCan(...args); } };
});

import { RolesMatrix } from '@/views/roles-matrix';

describe('the roles and access matrix inside a page that redraws', () => {
  it('is worked out once, not again on each redraw of the page around it, such as each keystroke in a sheet', () => {
    const Page = ({ typed }: { typed: string }) => <div data-typed={typed}><RolesMatrix /></div>;
    const { rerender } = render(<Page typed="" />);
    const once = asked.count;
    expect(once).toBeGreaterThan(0);
    for (const typed of ['M', 'Ma', 'May', 'Maya']) rerender(<Page typed={typed} />);
    expect(asked.count).toBe(once);
  });
});
