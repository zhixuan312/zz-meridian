// @vitest-environment node
// Named cli-* so the payload leaves it out: it runs the package's own decision about a team's tsconfig. `adopt` is the
// command a team runs once, on a project they own, and it rewrites their files — this is where a rewrite that dropped
// something of theirs would be caught.
//
// It calls `tsconfigWrites` and not `adopt` on purpose. `adopt` copies the template the payload carries, and a payload is
// a build product (`cli/payload/`, gitignored): a test that ran the whole command passed in this checkout, where an
// earlier build had left one, and failed in the release workflow's `tests/cli-` step, where the checkout is clean —
// "Reinstall zz-meridian, or report this if it persists". What the command does with the decision is covered end to end
// by `cli/scripts/smoke.ts --adopt`, from the tarball, in the same workflow.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { tsconfigWrites } from '../cli/src/adopt.ts';
import { jsoncExtras } from '../cli/src/files.ts';

const dirs: string[] = [];
afterAll(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

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
  /** The decision, run against a file written in a directory of its own. */
  const at = (tsconfig: string) => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-adopt-'));
    dirs.push(d);
    const p = path.join(d, 'tsconfig.json');
    fs.writeFileSync(p, tsconfig);
    return tsconfigWrites(p);
  };

  it('keeps what it cannot hold beside it, and says so, rather than dropping it in silence', () => {
    const r = at(COMMENTED);
    expect(r.writes.get('tsconfig.before.json')).toBe(COMMENTED);
    expect(r.notes.join('\n')).toMatch(/tsconfig\.json carried comments or trailing commas[^\n]*tsconfig\.before\.json/);
    // The rewritten file is the config Meridian needs, and it is plain JSON.
    const written = JSON.parse(r.writes.get('tsconfig.json')!);
    expect(written.compilerOptions).toMatchObject({ target: 'ES2022', allowImportingTsExtensions: true, noEmit: true, paths: { '@/*': ['./*'], '@meridian/*': ['./src/*'] } });
    // Their `@/*` decides where Meridian writes its own files: `./*` is the project root.
    expect(r.atAlias).toBe('.');
  });

  it('writes no backup when there was nothing to lose', () => {
    const r = at('{\n  "compilerOptions": {\n    "target": "ES2017",\n    "paths": { "@/*": ["./src/*"] }\n  }\n}\n');
    expect(r.writes.has('tsconfig.before.json')).toBe(false);
    expect(r.notes.join('\n')).not.toMatch(/tsconfig\.before\.json/);
    // Still the two things it is for: the target raised, said in a note, and the alias read from their own file.
    expect(r.notes.join('\n')).toMatch(/raised tsconfig target from ES2017 to ES2022/);
    expect(JSON.parse(r.writes.get('tsconfig.json')!).compilerOptions).toMatchObject({ target: 'ES2022', paths: { '@/*': ['./src/*'], '@meridian/*': ['./src/*'] } });
    expect(r.atAlias).toBe('src');
  });
});
