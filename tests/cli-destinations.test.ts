// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own destinations, which a product replaces.
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { nav } from '@/app.config';
import { FEATURES } from '@/data/features';
import { viewTools } from '@/logic/tools';


/** The rail, in its order: workspace, name, address, and the feature whose need the entry asks. */
const RAIL = [
  ['main', 'Home', '/', 'home'],
  ['main', 'Members', '/members', 'members'],
  ['main', 'Settings', '/settings', 'settings'],
  ['main', 'Design system', '/system', 'system'],
  ['main', 'Docs', '/system/start/start-a-dashboard', 'docs'],
  ['business', 'Revenue', '/business', 'revenue'],
  ['business', 'Customers', '/customers', 'customers'],
  ['business', 'Usage', '/usage', 'usage'],
  ['business', 'Requests', '/requests', 'requests'],
  ['engineering', 'Now', '/engineering', 'now'],
  ['engineering', 'Services', '/services', 'services'],
  ['engineering', 'Tickets', '/operations-tickets', 'tickets'],
  ['engineering', 'Tests', '/tests', 'tests'],
  ['engineering', 'Releases', '/releases', 'releases'],
  ['engineering', 'API keys', '/keys', 'keys'],
] as const;

describe('the destinations', () => {

  it('each ask the need of their own feature, by reference', () => {
    const items = nav.flatMap((g) => g.items);
    for (const [, label, href, feature] of RAIL) {
      expect(FEATURES[feature as keyof typeof FEATURES], `${label} has no feature "${feature}"`).toBeTruthy();
      expect(items.find((i) => i.href === href)!.needs, label).toBe(FEATURES[feature as keyof typeof FEATURES].needs);
    }
  });


  it('give one customer and one request a page that asks what its list asks', () => {
    const features = FEATURES as Record<string, { title: string; needs: unknown }>;
    expect(features.customer?.needs).toBe(features.customers.needs);
    expect(features.request).toBeTruthy();
  });

});

describe('the views an agent opens', () => {
  it('are named for their features', () => {
    const features = FEATURES as Record<string, { needs: unknown }>;
    for (const tool of viewTools) expect(tool.needs, tool.name).toBe(features[tool.name].needs);
  });

});
