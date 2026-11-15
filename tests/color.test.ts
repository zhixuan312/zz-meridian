import { describe, expect, it } from 'vitest';
import { deltaE, over, parse, ratio, simulate } from '@/lib/color';

describe('colour maths shared by the gate and the Atlas', () => {
  it('computes WCAG contrast', () => {
    expect(ratio(parse('#FFFFFF'), parse('#000000'))).toBeCloseTo(21, 1);
    expect(ratio(parse('#777777'), parse('#FFFFFF'))).toBeCloseTo(4.48, 1);
  });
  // Before this, only six digits were read: `#fff` came back as red 1, green 15/255 and a NaN blue — a colour no one wrote
  // — and `#rrggbbaa` silently lost its alpha. Nothing threw, so a gate computing a ratio from either got NaN, and
  // `NaN < 4.5` is false: a failing pair would have passed. Every hex form CSS allows is read; anything else is refused.
  it('parses every hex form CSS allows, and refuses a length that is not a colour', () => {
    expect(parse('#fff')).toEqual([1, 1, 1, 1]);
    expect(parse('#FFFFFF')).toEqual([1, 1, 1, 1]);
    expect(parse('#f00')).toEqual([1, 0, 0, 1]);
    expect(parse('#0000')).toEqual([0, 0, 0, 0]);
    expect(parse('#FFFF0080')).toEqual([1, 1, 0, 128 / 255]);
    expect(() => parse('#fffff')).toThrow(/cannot parse colour/);
    expect(() => parse('#ggg')).toThrow(/cannot parse colour/);
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
