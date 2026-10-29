// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { nextStep } from '../cli/src/create.ts';

// npm reads flags before `--` as its own config, so `npm run verify --full --timed` runs a plain verify, which never
// ends with the sentence the step tells the person to wait for.
describe("create's closing step", () => {
  it('names the full verify in a form the package manager passes on', () => {
    expect(nextStep('npm')).toContain('npm run verify -- --full --timed ends with');
    expect(nextStep('pnpm')).toContain('pnpm verify --full --timed ends with');
  });
});
