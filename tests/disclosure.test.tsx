import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Disclosure } from '@/components/ui/disclosure';

// A section opened in place, on the native element. The keyboard is the browser's own here, and the browser suites
// press it (the deep fixture /disclosure, and the Atlas walk).

describe('Disclosure', () => {
  it('is a details whose first child is its summary, with a chevron, and its content after', () => {
    const c = render(<Disclosure summary="Evidence">Six readings</Disclosure>).container;
    const details = c.querySelector('details')!;
    expect(details).not.toBeNull();
    const summary = details.firstElementChild!;
    expect(summary.tagName).toBe('SUMMARY');
    expect(summary.textContent).toContain('Evidence');
    expect(summary.querySelector('svg')).not.toBeNull();
    expect(details.textContent).toContain('Six readings');
    expect(details.open).toBe(false);
  });

  it('opens and closes when its summary is pressed', () => {
    const c = render(<Disclosure summary="Evidence">Six readings</Disclosure>).container;
    const details = c.querySelector('details')!;
    fireEvent.click(details.querySelector('summary')!);
    expect(details.open).toBe(true);
    fireEvent.click(details.querySelector('summary')!);
    expect(details.open).toBe(false);
  });

  it('starts open with defaultOpen, and takes its className', () => {
    const details = render(<Disclosure summary="Evidence" defaultOpen className="mt-4">Six readings</Disclosure>).container.querySelector('details')!;
    expect(details.open).toBe(true);
    expect(details.className).toMatch(/\bmt-4\b/);
  });
});
