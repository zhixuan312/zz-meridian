import { describe, expect, it } from 'vitest';
import { plural } from '@/lib/format';
import { summarise } from '@/logic/summarise';

/** A count is a count: one of anything reads as one, whichever place writes the sentence. */
describe('a count and its word', () => {
  it('takes the singular for one and the plural otherwise', () => {
    expect(plural(0, 'day')).toBe('days');
    expect(plural(1, 'day')).toBe('day');
    expect(plural(2, 'day')).toBe('days');
    expect(plural(1, 'key has', 'keys have')).toBe('key has');
    expect(plural(4, 'key has', 'keys have')).toBe('keys have');
  });

  it('reads as one in the line a reader takes away, not "1 services are down"', () => {
    const one = [{ name: 'Edge gateway', description: '', status: 'outage' as const, uptime: 0.99, latency: 38, days: [] }];
    expect(summarise(one).text).toBe('1 service is down');
    expect(summarise([...one, { ...one[0], name: 'Files' }]).text).toBe('2 services are down');
  });
});
