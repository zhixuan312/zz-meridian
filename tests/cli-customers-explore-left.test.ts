// @vitest-environment node
// The sample product's customer policy: a departed record stays readable but contributes to no customer figure.
import { describe, expect, it } from 'vitest';
import { runExplore } from '@/lib/explore';
import { formatCost } from '@/lib/format';
import { customersExplore } from '@/logic/customers-explore';
import { homeExplore } from '@/logic/home-explore';
import { revenueExplore } from '@/logic/revenue-explore';
import { memoryIO, reader } from './explore-io';

const rows = [
  { id: 'active', status: 'active', revenue: 10, requests: 100, tokens: 1000 },
  { id: 'departed', status: 'left', revenue: 200, requests: 500, tokens: 9000 },
];

describe('departed customers in prepared query figures', () => {
  for (const [page, query] of [['/customers', customersExplore], ['/', homeExplore], ['/business', revenueExplore]] as const) {
    it(`keeps the ${page} answer aligned with the page even when a departed record retains usage`, async () => {
      const io = memoryIO(rows);
      const answer = (await runExplore(query, { source: 'customers', measures: ['customers', 'revenue', 'requests'] }, reader('customers'), io, page)).answer;
      expect(answer).toContain('Customers: 1 customer.');
      expect(answer).toContain(`Revenue, last 30 days, in USD: ${formatCost(10)}.`);
      expect(answer).toContain('Requests, last 30 days: 100 requests.');
      const tokens = (await runExplore(query, { source: 'customers', measures: ['tokens'] }, reader('customers'), io, page)).answer;
      expect(tokens).toContain('Tokens, last 30 days: 1,000 tokens.');
    });
  }
});
