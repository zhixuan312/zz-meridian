// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { csvHeader, csvRow, toCsv } from '@/lib/csv';

describe('CSV cells', () => {
  it('read a formula-leading text value as text, and leave numbers alone', () => {
    const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const row = { a: '=1+1', b: '+cmd', c: '-2', d: '@SUM(A1)', e: '\tx', f: -5, g: 'plain' };
    expect(csvRow(keys, row)).toBe("'=1+1,'+cmd,'-2,'@SUM(A1),'\tx,-5,plain");
  });
  it('quote what RFC 4180 needs quoted, after the guard', () => {
    expect(csvRow(['a', 'b'], { a: 'x,y', b: '=a"b' })).toBe('"x,y","\'=a""b"');
    expect(csvRow(['a'], { a: '\rline' })).toBe('"\'\rline"');
  });
  it('keep toCsv and the header on the same encoder', () => {
    expect(csvHeader(['id', '=x'])).toBe("id,'=x");
    expect(toCsv([{ id: 'r1', note: '=HYPERLINK("x")' }])).toBe('id,note\r\nr1,"\'=HYPERLINK(""x"")"\r\n');
  });
});
