// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'tsconfig.json'), 'utf8')) as { include: string[]; exclude: string[] };

// `include` is `**/*.ts`, so every folder under the root is typechecked unless it is excluded. The build and scratch
// folders hold .ts files that are not source: a probe a person left in out/ compiled, and when it was removed before the
// next incremental check, tsc failed the gate with TS6053 for a file that no longer existed. Next's generated types are
// the one generated folder that must stay in.
describe('the type check’s scope', () => {
  it('leaves the build and scratch folders out, and keeps the types Next writes in', () => {
    for (const dir of ['out', 'build', 'coverage', 'test-results', '.turbo', '.vercel', '.meridian/update']) expect(config.exclude).toContain(dir);
    expect(config.include).toContain('.next/types/**/*.ts');
    expect(config.include).toContain('.next/dev/types/**/*.ts');
  });
});
