import { describe, expect, it } from 'vitest';
import { requestsSource } from '@/logic/requests-explore';
import { retryable } from '@/logic/request-context';
import type { Condition } from '@/lib/collection';

/**
 * A failed request is a 5xx or a 429, wherever it is counted: the request page's replay, the list's error rate and the
 * agent's "Errors and limits" measure each read it. The measure listed 500 to 511, so a 520 from a proxy counted as an
 * error on the page and not to the agent.
 */
describe('a failed request', () => {
  const errors = requestsSource.measures.errors as { where?: Condition[] };
  const where = errors.where?.[0];
  const counted = new Set(where && Array.isArray(where.value) ? (where.value as number[]) : []);

  it('is the same status set to the agent as to the page', () => {
    const differ = Array.from({ length: 500 }, (_, i) => 100 + i).filter((status) => counted.has(status) !== retryable({ status }));
    expect(differ).toEqual([]);
  });
});
