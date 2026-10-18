// @vitest-environment jsdom
// A toggle probe compares a snapshot of what its resultSelector matches before and after the press. It read the first
// 80 characters of each element, so an inline confirm at the end of a long row was a control that "changed nothing" (#52).
import { expect, it } from 'vitest';
import { DEEP_SOURCE } from '../scripts/lib/deep.ts';
import { DEEP_MATCHES, SNAP } from '../scripts/lib/journey.ts';

it('counts a change past the 80th character of a matched element, and nothing else', () => {
  (0, eval)(DEEP_SOURCE);
  (0, eval)(DEEP_MATCHES);
  const snap = (0, eval)(SNAP) as (selector: string) => string;
  document.body.innerHTML = `<table><tbody><tr><td>${'x'.repeat(116)}</td><td><button>Revoke</button></td></tr></tbody></table>`;
  const before = snap('tbody tr');
  expect(snap('tbody tr')).toBe(before);
  document.querySelector('button')!.outerHTML = '<span>Revoke this key? <button>Cancel</button><button>Revoke</button></span>';
  expect(snap('tbody tr')).not.toBe(before);
});
