// @vitest-environment node
// Named cli-* so the payload leaves it out: it tests a script of the package's own tooling.
import { describe, expect, it } from 'vitest';

describe('cli/scripts/consumer.ts packing', () => {
  it('labels the pack as the next patch version', async () => {
    const { nextPatch } = await import('../cli/scripts/consumer.ts');
    expect(nextPatch('0.39.2')).toBe('0.39.3');
    expect(nextPatch('1.0.9')).toBe('1.0.10');
    expect(nextPatch('2.14.0')).toBe('2.14.1');
  });

  it('runs nothing when imported', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const pack = path.resolve(import.meta.dirname, '..', 'out', 'smoke-pack');
    const before = fs.existsSync(pack) ? fs.statSync(pack).mtimeMs : null;
    await import('../cli/scripts/consumer.ts');
    expect(fs.existsSync(pack) ? fs.statSync(pack).mtimeMs : null).toBe(before);
  });
});
