import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Row } from '@/components/base/shell';

/** A row of tiles never leaves a hole, whatever its count (#111); base.css spans the last of five or more. */
describe('Row split="tiles"', () => {
  const classes = (n: number) => {
    const { container } = render(<Row split="tiles">{Array.from({ length: n }, (_, i) => <div key={i} className="card">Tile {i}</div>)}</Row>);
    return container.querySelector('[data-split="tiles"]')!.className;
  };

  it('lets one tile span the row', () => {
    expect(classes(1)).not.toMatch(/grid-cols-[2-4]/);
  });

  it('keeps two to four tiles as they were', () => {
    expect(classes(2)).toContain('@min-[34rem]:grid-cols-2');
    expect(classes(3)).toContain('@min-[48rem]:grid-cols-3');
    expect(classes(4)).toContain('@min-[62rem]:grid-cols-4');
  });

  it('runs five or more in rows of two, then three, never four', () => {
    for (const n of [5, 7, 12]) {
      expect(classes(n)).toContain('@min-[34rem]:grid-cols-2');
      expect(classes(n)).toContain('@min-[48rem]:grid-cols-3');
      expect(classes(n)).not.toContain('grid-cols-4');
    }
  });
});
