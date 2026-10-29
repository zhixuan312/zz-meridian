import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KeyValue } from '@/components/ui/key-value';

/**
 * The card's spec has always said a long value truncates "with the full value in the title", and the component set none.
 * Found by the audit the first time it asked: at 1024px a request's facts read "03 Oct …", "GET /v…", "us-eas…", with
 * the whole of each kept nowhere on the page.
 */
describe('a key value list', () => {
  const dd = (items: Parameters<typeof KeyValue>[0]['items']) => [...render(<KeyValue items={items} />).container.querySelectorAll('dd')];

  it('keeps a cut value whole in its title: a value that is text titles itself', () => {
    const [region, size] = dd([{ label: 'Region', value: 'ap-southeast-1' }, { label: 'Size', value: 104 }]);
    expect(region.getAttribute('title')).toBe('ap-southeast-1');
    expect(size.getAttribute('title')).toBe('104');
  });

  it('takes the whole value as `title` when the value is drawn as a node, and leaves an untitled node alone', () => {
    const [endpoint, status] = dd([
      { label: 'Endpoint', value: <span><b>GET</b> /v1/documents/:id</span>, title: 'GET /v1/documents/:id' },
      { label: 'Status', value: <span>503 Unavailable</span> },
    ]);
    expect(endpoint.getAttribute('title')).toBe('GET /v1/documents/:id');
    expect(status.getAttribute('title')).toBeNull();
  });

  it('adds no title to a value that wraps, which is read whole already', () => {
    const [path] = dd([{ label: 'Path', value: '/v1/a/long/path/that/wraps', wrap: true }]);
    expect(path.getAttribute('title')).toBeNull();
  });

  // On a phone there is no hover, so a title is no answer there: below the width where a sentence value cannot fit
  // beside its label, the value wraps the way `wrap` asks for (issue #89). Above it, the single line and its title stay.
  it('wraps a value in a row too narrow to hold it, rather than cutting it behind a hover no phone has', () => {
    const [region] = dd([{ label: 'Region', value: 'ap-southeast-1' }]);
    expect(region.className).toMatch(/@max-\[26rem\]:whitespace-normal/);
    expect(region.className).toMatch(/@max-\[26rem\]:\[overflow-wrap:anywhere\]/);
    expect(region.className).toMatch(/\btruncate\b/);
    // A value that already wraps asks for nothing more, and keeps its own rule.
    const [path] = dd([{ label: 'Path', value: '/v1/a/long/path', wrap: true }]);
    expect(path.className).toMatch(/\[overflow-wrap:anywhere\]/);
    expect(path.className).not.toMatch(/\btruncate\b|@max-\[26rem\]/);
  });

  // Two columns are for a wide card, and a card's width is not the window's: at a 1024px window the request card is
  // 458px wide, and two columns by the window's breakpoint left each value about 50px.
  it('counts its two columns from its own width, not the window\'s', () => {
    const { container } = render(<KeyValue columns={2} items={[{ label: 'Region', value: 'eu-west-1' }, { label: 'Model', value: 'meridian-large' }]} />);
    const dl = container.querySelector('dl')!;
    expect(dl.parentElement!.className).toContain('@container');
    expect(dl.className).toMatch(/@min-\[40rem\]:grid-cols-2/);
    expect(dl.className).not.toMatch(/(^|\s)sm:grid-cols-2/);
  });

  it('keeps the hairline under every row but the last of a one-column list', () => {
    const { container } = render(<KeyValue items={[1, 2, 3, 4].map((n) => ({ label: `Fact ${n}`, value: n }))} />);
    const rows = [...container.querySelectorAll('dl > div')];
    expect(rows).toHaveLength(4);
    // The hairline is on every row but the last, which is what the case's name claims; and the two-column variant's own
    // selector, whose leaking into one column is the regression it was written for, is on none of them.
    for (const row of rows.slice(0, -1)) expect(row.className).toMatch(/\bborder-b\b/);
    expect(rows.at(-1)!.className).toMatch(/last:border-0/);
    for (const row of rows) expect(row.className).not.toMatch(/nth-last-child\(2\)/);
  });
});

// The README: an unknown value shows an em dash in ink-3, never "0" or a blank. A null drew a blank row.
describe('a Key value row whose value is unknown', () => {
  it('draws an em dash in ink-3 for null, undefined and empty text, and keeps 0 as 0', () => {
    render(<KeyValue items={[{ label: 'Owner', value: null }, { label: 'Region', value: undefined }, { label: 'Note', value: '' }, { label: 'Retries', value: 0 }]} />);
    const values = screen.getAllByRole('definition');
    expect(values.map((d) => d.textContent)).toEqual(['—', '—', '—', '0']);
    for (const d of values.slice(0, 3)) {
      expect(d.querySelector('.text-ink-3')).toBeTruthy();
      expect(d.getAttribute('title')).toBeNull();
    }
  });
});
