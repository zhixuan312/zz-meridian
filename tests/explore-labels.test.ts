// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { exploreSchema, type PreparedQuery } from '@/lib/explore';

/**
 * A filter whose values a source reads through `labels` names each value with its label in the schema the model is
 * handed: the hours keep a weekday as 0 to 6, and a model told only "0, 1, …, 6" cannot know that 6 is Sunday, so a
 * question about Sundays would narrow to the wrong day.
 */
const QUERY: PreparedQuery = {
  sources: {
    hours: {
      collection: 'hours',
      filters: { weekday: { ops: ['eq', 'in'], values: [0, 1, 2, 3, 4, 5, 6] }, hour: { ops: ['eq'], values: [0, 22] } },
      facets: ['weekday'],
      measures: { requests: { label: 'Requests', unit: 'requests', definition: 'Requests in the hour.', agg: 'sum', field: 'requests' } },
      drill: { columns: ['id'], address: () => '/usage' },
      cannot: '',
      labels: { weekday: { 0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday', 4: 'Friday', 5: 'Saturday', 6: 'Sunday' } },
    },
  },
};

describe('the schema a model is handed', () => {
  it("names a filter's values by their labels where the source has them", () => {
    const json = JSON.stringify(z.toJSONSchema(exploreSchema(QUERY, null)));
    expect(json).toContain('6 (Sunday)');
    expect(json).toContain('0 (Monday)');
    // A filter without labels lists its values as they are.
    expect(json).toMatch(/hour eq of 0, 22/);
  });
});
