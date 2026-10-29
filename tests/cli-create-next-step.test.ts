// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { create, nextStep } from '../cli/src/create.ts';

// npm reads flags before `--` as its own config, so `npm run verify --full --timed` runs a plain verify, which never
// ends with the sentence the step tells the person to wait for.
describe("create's closing step", () => {
  it('names the full verify in a form the package manager passes on', () => {
    expect(nextStep('npm')).toContain('npm run verify -- --full --timed ends with');
    expect(nextStep('pnpm')).toContain('pnpm verify --full --timed ends with');
  });
});

// Every refusal of `create` is one line; a path that names a file threw ENOTDIR from readdirSync as a stack trace.
describe('create on a path that is a file', () => {
  it('refuses in one line, naming the file in the way', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'create-file-')), 'README.md');
    fs.writeFileSync(file, 'x');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(create({ dir: file, brand: {}, install: false })).not.toBe(0);
      expect(err.mock.calls.flat().join('\n')).toMatch(/is a file/);
    } finally {
      err.mockRestore();
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });
});
