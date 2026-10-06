// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); delete process.env.NEXT_TELEMETRY_DISABLED; });

describe('Next.js telemetry', () => {
  it("is off in the template's next.config, which next dev and next build load before they send any", async () => {
    await import('../next.config.ts');
    expect(process.env.NEXT_TELEMETRY_DISABLED).toBe('1');
  });
  it("is off for every next the gate, verify and the live check run, whatever the project's own config says", async () => {
    await import('../scripts/lib/bin.ts');
    expect(process.env.NEXT_TELEMETRY_DISABLED).toBe('1');
  });
});
