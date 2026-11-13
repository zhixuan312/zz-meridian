import { describe, expect, it } from 'vitest';
import * as facts from '../src/lib/facts.ts';
import * as summary from '../src/logic/summarise.ts';

describe('managed code carries no sample business', () => {
  it('has no service band or steady-day rule among the managed facts', () => {
    for (const name of ['inBand', 'steady']) expect(name in facts, name).toBe(false);
  });

  it('has no service noun as the managed summary default', () => {
    expect('SERVICE_NOUN' in summary).toBe(false);
  });
});
