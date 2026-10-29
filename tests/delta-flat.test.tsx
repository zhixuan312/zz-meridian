import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Delta } from '@/components/ui/delta';

const reading = (el: ReactElement) => render(el).container.firstElementChild as HTMLElement;

describe('a change reads as no change only when its format reads it as none', () => {
  it('an absolute change of $0.0003 is a change, under a format that shows it', () => {
    const d = reading(<Delta value={0.0003} format={(n) => `$${Math.abs(n)}`} intent="down" />);
    expect(d.title).toBe('Up $0.0003, worse');
    expect(d.textContent).toContain('$0.0003');
  });
  it('a share under a twentieth of a percent is no change', () => {
    expect(reading(<Delta value={0.0004} />).title).toBe('Unchanged');
    expect(reading(<Delta value={0.0006} />).title).toBe('Up 0.1%, better');
  });
});

describe('a format function is handed the magnitude, as its prop says', () => {
  it("a fall under the README's own format reads its figure once, with the arrow saying which way", () => {
    const d = reading(<Delta value={-23.73} format={(n) => `$${n}`} intent="up" />);
    expect(d.title).toBe('Down $23.73, worse');
    expect(d.textContent).toBe('down $23.73');
  });
});
