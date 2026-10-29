import { describe, expect, it } from 'vitest';
import { inWords, plural } from '@/lib/format';
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

// A list of names joins one way wherever it is written: the Activity line wrote three names as "A, B, C".
describe('items in a sentence', () => {
  it('joins the last with "and", the rest with commas', () => {
    expect(inWords([])).toBe('');
    expect(inWords(['Alice'])).toBe('Alice');
    expect(inWords(['Alice', 'Ravi'])).toBe('Alice and Ravi');
    expect(inWords(['Alice', 'Ravi', 'Mei'])).toBe('Alice, Ravi and Mei');
  });
});
