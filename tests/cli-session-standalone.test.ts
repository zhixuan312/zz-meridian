// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const gate = fs.readFileSync(path.join(ROOT, 'scripts/lib/update-session.ts'), 'utf8');

describe('the session rules', () => {
  it('stands alone for adopted plain-Node gates without CLI or package dependencies', () => {
    const specs = [...gate.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1] ?? m[2]);
    expect(specs.every((s) => s.startsWith('node:')), specs.join(', ')).toBe(true);
  });
});
