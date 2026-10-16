import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppMark } from '@/components/base/app-mark';

/**
 * The mark's sheen is a gradient the mark refers to by id, and a page holds more than one mark: the Atlas draws one in
 * the phone's top bar and one in the shelf, and both are mounted at every width, as are the embed frame's header and
 * footer. A fixed id was a duplicate on every one of those pages and `url(#am-sheen)` named two elements, so each mark
 * names its own.
 */
describe('the app mark\'s sheen', () => {
  it('is one gradient per mark, so two marks in a page never share an id', () => {
    const { container } = render(
      <>
        <AppMark size={20} />
        <AppMark size={28} />
      </>,
    );
    const ids = [...container.querySelectorAll('linearGradient')].map((g) => g.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    // Every fill that names a gradient names one this mark drew, and it is an id a `url(#…)` can carry as written.
    for (const g of container.querySelectorAll('linearGradient')) expect(g.id).toMatch(/^[A-Za-z][A-Za-z0-9_-]*$/);
    const named = [...container.querySelectorAll('[fill^="url(#"]')].map((r) => r.getAttribute('fill')!.slice(5, -1));
    expect(named).toHaveLength(2);
    for (const n of named) expect(ids).toContain(n);
  });
});
