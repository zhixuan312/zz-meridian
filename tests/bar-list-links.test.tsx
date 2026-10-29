import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BarList, type BarItem } from '@/components/charts/bar-list';

const customers: BarItem[] = [
  { key: 'northwind-labs', label: 'Northwind Labs', value: 409_206.8, href: '/customers/northwind-labs' },
  { key: 'halcyon-health', label: 'Halcyon Health', value: 301_000, href: '/customers/halcyon-health' },
  { key: 'atlas-freight', label: 'Atlas Freight', value: 250_000, href: '/customers/atlas-freight' },
  { key: 'mosaic-learning', label: 'Mosaic Learning', value: 120_000, href: '/customers/mosaic-learning' },
];

describe('a bar list whose rows name what has a page', () => {
  it('opens each row that has an address, by a link whose name is the row', () => {
    const { container } = render(<BarList items={customers} label="Enterprise" limit={6} />);
    const links = [...container.querySelectorAll('li a[href]')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(customers.map((c) => c.href));
    expect(links.map((a) => a.textContent?.trim())).toEqual(customers.map((c) => c.label));
    // One link a row: the bar and the figure are not a second way to the same page.
    for (const li of container.querySelectorAll('li')) expect(li.querySelectorAll('a').length).toBe(1);
  });

  it('draws a row with no address as text', () => {
    const regions: BarItem[] = [{ key: 'us-east-1', label: 'us-east-1', value: 40 }, { key: 'eu-west-1', label: 'eu-west-1', value: 30 }];
    const { container } = render(<BarList items={regions} label="By region" />);
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('folds the rest into one row that opens nothing, and names how many it holds', () => {
    const { container } = render(<BarList items={customers} label="Enterprise" limit={2} />);
    const rows = [...container.querySelectorAll('li')];
    expect(rows).toHaveLength(3);
    expect(rows[2].textContent).toMatch(/2 others/);
    expect(rows[2].querySelector('a')).toBeNull();
    expect([...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/customers/northwind-labs', '/customers/halcyon-health']);
  });
});
