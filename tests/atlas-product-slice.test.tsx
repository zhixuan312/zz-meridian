import { render } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it } from 'vitest';

import { readAll } from '@/data/read';
import type { CustomerRecord } from '@/data/sample';
import { customerRow } from '@/logic/customers-context';
import { CustomersView } from '@/views/customers';

describe('the walking slice: one template, in the Atlas and in the product', () => {
  it('is what the Customers page draws, with the page\'s own tiles and table inside it', async () => {
    const rows = ((await readAll('customers')).rows as CustomerRecord[]).map(customerRow);
    const { container } = render(<Tooltip.Provider><CustomersView rows={rows} /></Tooltip.Provider>);
    const template = container.querySelector('[data-template="records"]');
    expect(template).not.toBeNull();
    expect(template!.querySelectorAll('[data-split="tiles"] > *').length).toBe(3);
  });

  it('draws, with no customers, the table\'s first-run state and no tiles over it', () => {
    const { container } = render(<Tooltip.Provider><CustomersView rows={[]} /></Tooltip.Provider>);
    const template = container.querySelector('[data-template="records"]');
    expect(template!.querySelector('[data-split="tiles"]')).toBeNull();
    expect(template!.textContent).toContain('No customers yet');
  });
});
