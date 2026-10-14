// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own Revenue page, which a product replaces.
import { describe, expect, it } from 'vitest';
import { nextPlanWords } from '@/views/revenue-context';

/**
 * The ladder says a customer is close to the next plan by the share it pays of what that plan's smallest customer pays.
 * A customer already past it read "pays 2737% of what the smallest Starter customer pays", a share that reads as an
 * error; it is said to pay more.
 */
describe("the ladder's next-plan words", () => {
  it("give the share while the customer pays less than the next plan's smallest", () => {
    expect(nextPlanWords({ stage: 'Scale', share: 0.8 })).toBe('pays 80% of what the smallest Scale customer pays');
  });

  it('say the customer already pays more once it does, and the share at exactly as much', () => {
    expect(nextPlanWords({ stage: 'Starter', share: 27.37 })).toBe('already pays more than the smallest Starter customer');
    expect(nextPlanWords({ stage: 'Enterprise', share: 1 })).toBe('pays 100% of what the smallest Enterprise customer pays');
  });
});
