// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own pages, which a product replaces.
import { describe, expect, it } from 'vitest';

import { workspaceOf } from '@/views/workspaces';


describe('one customer has a page', () => {
  it('leads a refusal back into Business', () => {
    expect(workspaceOf('/customers/northwind-labs')).toBe('business');
  });

});

