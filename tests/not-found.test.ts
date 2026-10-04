import { describe, expect, it } from 'vitest';
import { nav } from '@/app.config';
import { nearestOf, readable } from '@/views/not-found';

// The Atlas's nested entries exist only while the Atlas does; brand.ts --product removes them with it.
const hasAtlas = nav.some((g) => g.items.some((i) => i.href === '/system'));

describe('nearestOf', () => {
  it('walks a missing record back to its list', () => {
    expect(nearestOf('/requests/req_missing')).toEqual({ href: '/requests', label: 'Requests', rest: '/req_missing' });
  });
  it('matches on a segment boundary only', () => {
    expect(nearestOf('/requestsx')).toEqual({ href: '/', label: 'Overview', rest: '/requestsx' });
  });
  it.runIf(hasAtlas)('prefers the longest entry: Docs over Design system', () => {
    expect(nearestOf('/system/start/start-a-dashboard/gone').label).toBe('Docs');
    expect(nearestOf('/system/gone').label).toBe('Design system');
  });
  it('keeps every missing segment after the match', () => {
    expect(nearestOf('/settings/billing/invoices/2026').rest).toBe('/billing/invoices/2026');
  });
  it('ignores a trailing slash', () => {
    expect(nearestOf('/requests/')).toEqual({ href: '/requests', label: 'Requests', rest: '' });
  });
  it('falls back to the Overview with the whole address left over', () => {
    expect(nearestOf('/this-page-does-not-exist').rest).toBe('/this-page-does-not-exist');
  });
});

describe('readable', () => {
  it('decodes percent-escapes', () => expect(readable('/a%20b')).toBe('/a b'));
  it('keeps a malformed escape as typed', () => expect(readable('/a%E0%A4%A')).toBe('/a%E0%A4%A'));
});
