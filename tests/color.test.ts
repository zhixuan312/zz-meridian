import { describe, expect, it } from 'vitest';
import { deltaE, over, parse, ratio, simulate } from '@/lib/color';

describe('colour maths shared by the gate and the Atlas', () => {
  it('computes WCAG contrast', () => {
    expect(ratio(parse('#FFFFFF'), parse('#000000'))).toBeCloseTo(21, 1);
    expect(ratio(parse('#777777'), parse('#FFFFFF'))).toBeCloseTo(4.48, 1);
  });
  it('parses oklch with and without alpha, and composites', () => {
    const c = parse('oklch(0.56 0.2 277 / 0.16)');
    expect(c[3]).toBeCloseTo(0.16);
    const onWhite = over(c, parse('#FFFFFF'));
    expect(onWhite[3]).toBe(1);
    expect(ratio(onWhite, parse('#FFFFFF'))).toBeLessThan(1.5);
  });
  it('parses lab(), the form a minifier may rewrite oklch() into', () => {
    // oklch(0.74 0.16 160 / 0.12) as the production build ships it.
    const c = parse('lab(71.9467% -53.4699 20.991/.12)');
    expect(c[3]).toBeCloseTo(0.12);
    const o = parse('oklch(0.74 0.16 160)');
    expect(deltaE(c, o)).toBeLessThan(1);
    expect(ratio(parse('lab(100 0 0)'), parse('#FFFFFF'))).toBeCloseTo(1, 2);
  });
  it('simulates colour-vision deficiency and measures distance in OKLab', () => {
    const red = parse('#D93025'), green = parse('#1E8E3E');
    expect(deltaE(red, green)).toBeGreaterThan(deltaE(simulate(red, 'deutan'), simulate(green, 'deutan')));
  });
});
