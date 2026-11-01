import { afterEach, describe, expect, it, vi } from 'vitest';
import { CSV_BOM, downloadFile, toCsv } from '@/lib/csv';

/** Excel on Windows reads a CSV without a byte order mark in the system code page (#113). */
describe('CSV byte order mark', () => {
  afterEach(() => vi.restoreAllMocks());

  const saved = (type?: string) => {
    let blob: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => { blob = b as Blob; return 'blob:x'; });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadFile('rows.csv', toCsv([{ name: 'Zoë' }]), type);
    return blob!.arrayBuffer().then((b) => new Uint8Array(b));
  };

  it('leaves the rows themselves without one', () => {
    expect(toCsv([{ name: 'Zoë' }]).startsWith(CSV_BOM)).toBe(false);
  });

  it('starts a saved CSV with the UTF-8 byte order mark', async () => {
    expect([...(await saved()).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it('adds none to a file that is not CSV', async () => {
    expect((await saved('application/json'))[0]).not.toBe(0xef);
  });
});
