// Named cli-* so the payload leaves it out: it is about the sample's own Home and customer page, which a product replaces.
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
// A product that renamed two workspaces in its configuration, as `workspaces`' own comment says it may.
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, workspaces: { ...real.workspaces, business: { ...real.workspaces.business, label: 'Commerce' }, engineering: { ...real.workspaces.engineering, label: 'Platform' } } };
});

import { HomeBody } from '@/views/home';
import { CustomerTrail } from '@/views/customer';
import { homeTool } from '@/logic/tools';

describe('a workspace renamed in the configuration', () => {
  it('is named so on Home, where each team has its card', async () => {
    const { data } = await homeTool.read({ period: '30d' });
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(<Tooltip.Provider><HomeBody {...data} /></Tooltip.Provider>), 'text/html');
    expect(doc.querySelector('[role="region"][aria-label="Commerce"]')).not.toBeNull();
    expect(doc.querySelector('[role="region"][aria-label="Platform"]')).not.toBeNull();
    expect(doc.querySelector('[role="region"][aria-label="Business"]')).toBeNull();
  });
  it('is named so in the trail above a customer', () => {
    expect(renderToStaticMarkup(<CustomerTrail />)).toMatch(/>Commerce</);
  });
});
