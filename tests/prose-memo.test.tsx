import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const markdown = vi.hoisted(() => ({ calls: 0 }));
vi.mock('react-markdown', () => ({ default: () => { markdown.calls += 1; return null; } }));

import { Prose } from '@/components/patterns/prose';

// react-markdown parses its whole input on every render. Prose takes a string, so it is compared by value and a parent
// that renders again with the same text does not parse it again (issue #24). Asserting `$$typeof === react.memo` said
// only that the wrapper was there: it could not see the comparison, and a comparator returning true for different text
// would have passed it while the bug came back.
describe('Prose', () => {
  it('parses its text once, however often the parent renders, and again when the text changes', () => {
    const { rerender } = render(<Prose>Hello **world**</Prose>);
    expect(markdown.calls).toBe(1);
    rerender(<Prose>Hello **world**</Prose>);
    expect(markdown.calls).toBe(1);
    rerender(<Prose>Hello **there**</Prose>);
    expect(markdown.calls).toBe(2);
  });
});
