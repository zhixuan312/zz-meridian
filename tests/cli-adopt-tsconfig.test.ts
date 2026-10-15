// @vitest-environment node
// Named cli-* so the payload leaves it out: it runs the package's own adopt, end to end, against a copy of the fixture
// project. `adopt` is the command a team runs once, on a project they own, and it rewrites their files — this is where a
// rewrite that dropped something of theirs would be caught.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { adopt } from '../cli/src/adopt.ts';
import { jsoncExtras } from '../cli/src/files.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const dirs: string[] = [];
afterAll(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

/** A copy of the fixture project (a create-next-app app), with `tsconfig` in place of its own when one is given. */
const project = (tsconfig?: string) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-adopt-'));
  dirs.push(d);
  fs.cpSync(path.join(ROOT, 'cli/test/fixture-next-app'), d, { recursive: true });
  if (tsconfig !== undefined) fs.writeFileSync(path.join(d, 'tsconfig.json'), tsconfig);
  return d;
};

/** adopt, with everything it says collected rather than printed. */
const runAdopt = (root: string) => {
  const said: string[] = [];
  const log = vi.spyOn(console, 'log').mockImplementation((l: unknown) => { said.push(String(l)); });
  const err = vi.spyOn(console, 'error').mockImplementation((l: unknown) => { said.push(String(l)); });
  try {
    return { code: adopt({ root, brand: { name: 'Acme Ops' }, allowDirty: true, install: false }), said: said.join('\n') };
  } finally { log.mockRestore(); err.mockRestore(); }
};

/** A tsconfig as a team's own file may be written: two comments, and a trailing comma JSON does not take. */
const COMMENTED = `{
  // Next writes and updates this file.
  "compilerOptions": {
    "target": "ES2017",
    "paths": { "@/*": ["./*"] },
    "plugins": [{ "name": "next" }],
  },
  /* What the build reads. */
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"],
}
`;

describe('what a JSONC file carries beyond JSON', () => {
  it('is a comment or a trailing comma, and not the // inside a string', () => {
    expect(jsoncExtras(COMMENTED)).toBe(true);
    expect(jsoncExtras('{\n  "a": 1,\n}\n')).toBe(true);
    expect(jsoncExtras('{\n  "registry": "https://registry.npmjs.org/",\n  "a": 1\n}\n')).toBe(false);
    expect(jsoncExtras('{\n  // one\n  "a": 1\n}\n')).toBe(true);
  });
});

describe('adopt and the team\'s tsconfig', () => {
  it('keeps what it cannot hold beside it, and says so, rather than dropping it in silence', () => {
    const root = project(COMMENTED);
    const { code, said } = runAdopt(root);
    expect(code, said).toBe(0);
    expect(fs.readFileSync(path.join(root, 'tsconfig.before.json'), 'utf8')).toBe(COMMENTED);
    expect(said).toMatch(/tsconfig\.json carried comments or trailing commas[^\n]*tsconfig\.before\.json/);
    // The rewritten file is the config Meridian needs, and it is plain JSON.
    const written = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'));
    expect(written.compilerOptions).toMatchObject({ target: 'ES2022', allowImportingTsExtensions: true, noEmit: true, paths: { '@/*': ['./*'], '@meridian/*': ['./src/*'] } });
  }, 120_000);

  it('writes no backup when there was nothing to lose', () => {
    const root = project();
    const { code, said } = runAdopt(root);
    expect(code, said).toBe(0);
    expect(fs.existsSync(path.join(root, 'tsconfig.before.json'))).toBe(false);
    expect(said).not.toMatch(/tsconfig\.before\.json/);
  }, 120_000);
});
