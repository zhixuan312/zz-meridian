// @vitest-environment node
// Named cli-* so the payload leaves it out: it copies the template's own tracked files.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { templateCopy } from './cli-template-copy';

const dir = templateCopy('zz-day-cut-');
/** A path a case planted, removed after it, so one red leaves the next case the template's copy. */
const touched = new Set<string>();
const put = (f: string, text: string) => {
  touched.add(f);
  fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
  fs.writeFileSync(path.join(dir, f), text);
};
afterEach(() => {
  for (const f of touched) fs.rmSync(path.join(dir, f), { force: true });
  touched.clear();
});
const check = () => spawnSync(process.execPath, ['scripts/check.ts'], { cwd: dir, encoding: 'utf8' }).stdout;

/**
 * The rule reads a line, not a folder: a ten-character slice is a day cut only when the value it slices is a date —
 * `toISOString().slice(0, 10)`, its date half before `T`, or a named date, `iso`, `row.date`, `createdAt`. A top-ten
 * slice is not one, so the rule reports nothing for it and has no opt-out that could hide a real cut.
 */
describe('the day-cut rule', () => {
  it('passes the template as it is', () => {
    expect(check()).toMatch(/^0 problems/m);
  }, 60_000);

  it('refuses a date cut to its ten characters, in each form a line writes it', () => {
    put('src/components/rogue-day.ts', 'export const day = (iso: string) => iso.slice(0, 10);\nexport const stamp = (at: Date) => at.toISOString().slice(0, 10);\n');
    const out = check();
    expect(out).toMatch(/src\/components\/rogue-day\.ts:1: iso\.slice\(0, 10\) cuts a date to its UTC day/);
    expect(out).toMatch(/src\/components\/rogue-day\.ts:2: toISOString\(\)\.slice\(0, 10\) cuts a date to its UTC day/);
  }, 60_000);

  it('leaves a top-ten slice of something that is not a date alone', () => {
    put('src/components/rogue-day.ts', 'export const top = (rows: string[]) => rows.slice(0, 10);\n');
    expect(check()).toMatch(/^0 problems/m);
  }, 60_000);
});
