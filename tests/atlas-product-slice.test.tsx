import { render } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

// One implementation, watched: every render of the template passes through this count, whoever asked for it.
const seen = vi.hoisted(() => ({ renders: 0 }));
vi.mock('@/components/templates/records', async (original) => {
  const actual = await original<typeof import('@/components/templates/records')>();
  type Props = Parameters<typeof actual.Records>[0];
  return { ...actual, Records: (props: Props) => { seen.renders += 1; return actual.Records(props); } };
});

import Preview from '@/components/templates/records/preview';
import { CARDS } from '@/system/registry';
import { CustomersView } from '@/views/customers';

describe('the walking slice: one template, in the Atlas and in the product', () => {
  it('is catalogued in the Atlas at layer 4, with a preview to draw', () => {
    const card = CARDS.find((c) => `${c.section}/${c.id}` === 'pages/template-records');
    expect(card).toMatchObject({ layer: 4, dir: 'src/components/templates/records' });
    expect(card?.Preview).toBeTruthy();
  });

  it('is what the Atlas preview draws', () => {
    seen.renders = 0;
    const { container } = render(<Tooltip.Provider><Preview /></Tooltip.Provider>);
    expect(seen.renders).toBeGreaterThan(0);
    expect(container.querySelector('[data-template="records"]')).not.toBeNull();
  });

  it('is what the Customers page draws, with the page\'s own tiles and table inside it', () => {
    seen.renders = 0;
    const { container } = render(<Tooltip.Provider><CustomersView rows={[]} /></Tooltip.Provider>);
    expect(seen.renders).toBe(1);
    const template = container.querySelector('[data-template="records"]');
    expect(template).not.toBeNull();
    expect(template!.querySelectorAll('[data-split="tiles"] > *').length).toBe(3);
    expect(template!.textContent).toContain('No customers yet');
  });
});
