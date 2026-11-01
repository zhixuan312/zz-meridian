import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Row } from '@/components/base/shell';

/** A row of tiles never leaves a hole, whatever its count (#111). */
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

  it('spans the last of five over the two cells each layout leaves', () => {
    const c = classes(5);
    expect(c).toContain('@min-[48rem]:grid-cols-3');
    expect(c).toContain('@min-[34rem]:[&>:last-child]:col-span-2');
    expect(c).toContain('@min-[48rem]:[&>:last-child]:col-span-2');
    expect(c).not.toContain('grid-cols-4');
  });

  it('spans nothing extra when six fill rows of two and of three', () => {
    const c = classes(6);
    expect(c).not.toContain('col-span-2');
    expect(c).toContain('@min-[48rem]:[&>:last-child]:col-span-1');
  });

  it('spans the whole row of three for a seventh tile alone on it', () => {
    expect(classes(7)).toContain('@min-[48rem]:[&>:last-child]:col-span-3');
  });
});
