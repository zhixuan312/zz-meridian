// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own pages, which a product replaces.
import { describe, expect, it } from 'vitest';

import { workspaceOf } from '@/views/workspaces';


describe('the workspace a customer\'s page belongs to', () => {
  it('is Business, so a refusal there leads back into it', () => {
    expect(workspaceOf('/customers/northwind-labs')).toBe('business');
  });
});

