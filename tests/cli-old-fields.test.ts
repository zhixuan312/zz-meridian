// @vitest-environment node
// Named cli-* so the payload leaves it out: it searches the template's own source, guides and tests, which a product does not keep.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The company sells tokens, so what its customers pay is its revenue, and a customer has a date it joined: `spend`
 * became `revenue` on a day and on a customer, and a customer's `since` became `joined`. A renamed field is renamed
 * everywhere it is read or named, with no alias left behind, and no page, context or tool of the product still calls
 * the figure spend. The changelog, the decision records and the evidence of past releases are history and keep the old
 * names.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const SELF = 'tests/cli-old-fields.test.ts';
const HISTORY = /^(CHANGELOG\.md$|decisions\/|docs\/evidence\/)/;
const TEXT = /\.(ts|tsx|mts|mjs|js|json|md|css|yml|yaml)$/;
const files = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter((f) => TEXT.test(f) && !HISTORY.test(f) && f !== SELF && fs.existsSync(path.join(ROOT, f)));

/** The field as code reads or names it: a property, a key, a destructured name, or the name in quotes or backticks. */
const SPEND_FIELD = [/\.spend\b/, /\bspend\s*:/, /\{\s*spend\b/, /['"`]spend['"`]/];
/** The same for `since`, which is also an ordinary word and the name of other things (a migration's first version, a timer). */
const SINCE_FIELD = [/\.since\b/, /\bsince\s*:/, /\{\s*since\b/, /['"`]since['"`]/];
/** Where the product's own records are read and named: its data, its views, its pages and their specifications, and the sample. */
const PRODUCT = /^(src\/data\/|src\/views\/|src\/system\/fixtures\/|app\/)/;
/** Where the product speaks: a page, a context, a tool. The sample and the cards may still use the word in an example. */
const SURFACE = /^(src\/data\/|src\/views\/|app\/)/;

function hits(pick: (file: string) => RegExp[]): string[] {
  const out: string[] = [];
  for (const file of files) {
    const patterns = pick(file);
    if (!patterns.length) continue;
    fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n').forEach((line, i) => {
      if (patterns.some((re) => re.test(line))) out.push(`${file}:${i + 1}: ${line.trim().slice(0, 140)}`);
    });
  }
  return out;
}

describe('the renamed fields', () => {
  it('no code, test or guide reads or names a field called spend', () => {
    const found = hits(() => SPEND_FIELD);
    expect(found, `${found.length} places still read or name spend:\n${found.join('\n')}`).toEqual([]);
  });

  it('no page, context or tool of the product calls what customers paid spend', () => {
    const found = hits((file) => (SURFACE.test(file) ? [/\bspend\b/i] : []));
    expect(found, `${found.length} lines of the product still say spend:\n${found.join('\n')}`).toEqual([]);
  });

  it('no record of the product is read or named by a field called since', () => {
    const found = hits((file) => (PRODUCT.test(file) ? SINCE_FIELD : []));
    expect(found, `${found.length} places still read or name since:\n${found.join('\n')}`).toEqual([]);
  });
});
