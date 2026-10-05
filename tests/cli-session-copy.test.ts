// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const gate = fs.readFileSync(path.join(ROOT, 'scripts/lib/update-session.ts'), 'utf8');
const cli = fs.readFileSync(path.join(ROOT, 'cli/src/update-session.ts'), 'utf8');

describe('the session rules', () => {
  it('are the same bytes in the CLI and in the gate', () => expect(cli).toBe(gate));
  it('import nothing but node:crypto, so both copies stand alone', () => {
    const specs = [...gate.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1] ?? m[2]);
    expect(specs.every((s) => s === 'node:crypto'), specs.join(', ')).toBe(true);
  });
});
