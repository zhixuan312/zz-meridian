// @vitest-environment node
// Named cli-* so the payload leaves it out: it copies the template's own tracked files.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * The specification of every page with a view tool says what the agent does there (FR-42, AC-14.5): under `## Agents`, a
 * section `### What the agent does here` with a line `Protagonist: <the card's title>.` and at least three items, each a
 * question in quotes, a dash, and what the prepared query is asked. `node scripts/check.ts` fails one without it, or
 * without its form, and asks nothing of Settings, the Atlas or an embed view, which have no view tool of their own.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-agent-section-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
for (const f of execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((x) => x && !x.startsWith('cli/'))) {
  const src = path.join(ROOT, f);
  if (!fs.lstatSync(src, { throwIfNoEntry: false })?.isFile()) continue;
  fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
  fs.copyFileSync(src, path.join(dir, f));
}
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
const check = () => spawnSync(process.execPath, ['scripts/check.ts'], { cwd: dir, encoding: 'utf8' }).stdout;
const USAGE = 'app/(dashboard)/usage/README.md';
const SETTINGS = 'app/(dashboard)/settings/README.md';
const original = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const put = (f: string, text: string) => fs.writeFileSync(path.join(dir, f), text);
/** Usage's specification with its section's body replaced by `body`, the heading kept. */
const withSection = (body: string) => original(USAGE).replace(/(### What the agent does here\n)[\s\S]*?(?=\n### |\n## |$)/, `$1\n${body}\n`);

describe('a page with a view tool says what the agent does there', () => {
  it('passes the template, where all fourteen do and Settings does not', () => {
    const out = check();
    expect(out).toMatch(/^0 problems/m);
    expect(original(SETTINGS)).not.toContain('### What the agent does here');
  }, 60_000);

  it('fails a specification without the section, naming it', () => {
    put(USAGE, original(USAGE).replace(/### What the agent does here\n[\s\S]*?(?=\n### |\n## |$)/, ''));
    expect(check()).toMatch(/app\/\(dashboard\)\/usage\/README\.md: .*What the agent does here/);
    put(USAGE, original(USAGE));
  }, 60_000);

  it('fails a section with no Protagonist line, or fewer than three questions in the form', () => {
    put(USAGE, withSection('- "How many requests came at 22:00 UTC on each weekday?" — the hours by weekday\n- "Which hours are busiest?" — the hours by hour\n- "Which model?" — the usage by model'));
    expect(check()).toMatch(/app\/\(dashboard\)\/usage\/README\.md: .*Protagonist/);
    put(USAGE, withSection('Protagonist: Requests.\n\n- "How many requests came at 22:00 UTC on each weekday?" — the hours by weekday\n- "Which hours are busiest?" — the hours by hour'));
    expect(check()).toMatch(/app\/\(dashboard\)\/usage\/README\.md: .*three/);
    put(USAGE, withSection('Protagonist: Requests.\n\n- How many requests came at 22:00? — the hours\n- Which hours are busiest? — the hours\n- Which model? — the usage'));
    expect(check()).toMatch(/app\/\(dashboard\)\/usage\/README\.md: .*three/);
    put(USAGE, original(USAGE));
  }, 60_000);

  it('asks nothing of a page with no view tool, though it has an agents section', () => {
    expect(fs.readFileSync(path.join(dir, SETTINGS), 'utf8')).toContain('## Agents');
    put(SETTINGS, `${original(SETTINGS)}\n`);
    expect(check()).not.toMatch(/settings\/README\.md: .*What the agent does here/);
  }, 60_000);
});
