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

});

// An unknown value shows an em dash, never "0" or a blank. A null drew a blank row.
describe('a Key value row whose value is unknown', () => {
  it('draws an em dash for null, undefined and empty text, and keeps 0 as 0', () => {
    render(<KeyValue items={[{ label: 'Owner', value: null }, { label: 'Region', value: undefined }, { label: 'Note', value: '' }, { label: 'Retries', value: 0 }]} />);
    const values = screen.getAllByRole('definition');
    expect(values.map((d) => d.textContent)).toEqual(['—', '—', '—', '0']);
    for (const d of values.slice(0, 3)) {
      expect(d.getAttribute('title')).toBeNull();
    }
  });
});
