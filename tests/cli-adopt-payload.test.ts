// @vitest-environment node
// A shipped component may import only what the adopt payload delivers. An update that brings a component importing a
// module the payload leaves behind hands the team a project that does not build.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { adoptSetOf, FIXED } from '../cli/src/ownership.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const files = (dir: string): string[] => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));

/**
 * The payload as the adopt route takes it: every component but its README and preview, and every fixed file. `FIXED` is
 * read rather than written out again here, because a fixed file listed in two places is one that drifts from the rule.
 */
const PAYLOAD = [
  ...files('src/components').filter((f) => !/(README\.md|preview\.tsx)$/.test(f)),
  ...FIXED,
];

/** Every `@/…` specifier a file imports, types included (a missing type module fails the type check too), as a path under src/ without its extension. */
const imported = (file: string): string[] => [
  ...fs.readFileSync(path.join(ROOT, file), 'utf8').matchAll(/(?:from\s*|import\s*\(\s*)'@\/([^']+)'/g),
].map((m) => `src/${m[1]}`);

/** A module path as a file or a folder's index, without its extension. */
const bare = (p: string) => p.replace(/\.(?:ts|tsx)$/, '').replace(/\/index$/, '');

describe('the adopt payload', () => {
  it('carries every module a component it ships imports', () => {
    // adopt writes the project's src/app.config.ts from the release's own, so a component may import it.
    const delivered = new Set([...adoptSetOf(PAYLOAD), 'src/app.config.ts'].map(bare));
    const missing = [...new Set(PAYLOAD.flatMap(imported))].filter((p) => !delivered.has(bare(p)));
    expect(missing, 'a component imports a module an adopted project would not have').toEqual([]);
  });

  it('ships the three helpers the cards call, and no other logic module', () => {
    const delivered = adoptSetOf(PAYLOAD).filter((p) => p.startsWith('src/logic/'));
    expect(delivered).toEqual([
      'src/logic/after-start.ts',
      'src/logic/derivations.ts',
      'src/logic/summarise.ts',
    ]);
  });
});
