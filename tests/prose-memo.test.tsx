import { describe, expect, it } from 'vitest';
import { Prose } from '@/components/patterns/prose';

// react-markdown parses its whole input on every render. Prose takes a string, so it is compared by value and a parent
// that renders again with the same text does not parse it again (issue #24).
describe('Prose', () => {
  it('is memoised on its text', () => {
    expect((Prose as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });
});
