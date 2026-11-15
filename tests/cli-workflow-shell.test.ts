// @vitest-environment node
// A single-quoted node script in a workflow ends at the first apostrophe, and the failure lands in a release, not in a
// test. One log line said "the protocol's": the shell closed the string there, and `tier2-attach` exited 2 with
// "unexpected EOF while looking for matching `'`". 0.39.5 was the first release to reach that line at all — every
// earlier run had nothing to attach and stopped a step sooner — so the Release never carried its record or history and
// nobody found out. This reads every workflow the way the shell does and refuses an apostrophe inside one.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = path.join(path.resolve(import.meta.dirname, '..'), '.github', 'workflows');

type Block = { file: string; line: number; body: string[]; terminated: boolean };

/** Every `node -e '` script in `text`, from its opening line to the line that is only a quote. */
export function nodeScripts(file: string, text: string): Block[] {
  const lines = text.split('\n');
  const found: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim() !== "node -e '") continue;
    let j = i + 1;
    while (j < lines.length && lines[j]!.trim() !== "'") j++;
    found.push({ file, line: i + 1, body: lines.slice(i + 1, j), terminated: j < lines.length });
    i = j;
  }
  return found;
}

const workflows = fs.readdirSync(DIR).filter((f) => f.endsWith('.yml'));
const scripts = workflows.flatMap((f) => nodeScripts(f, fs.readFileSync(path.join(DIR, f), 'utf8')));

describe('a node script inside a workflow', () => {
  it('finds the ones this repository runs', () => {
    expect(scripts.length, 'no single-quoted node script found: the reader is wrong, not the workflows').toBeGreaterThan(0);
  });

  it('is closed with a line of its own, so the shell is never left looking for one', () => {
    expect(scripts.filter((s) => !s.terminated).map((s) => `${s.file}:${s.line}`)).toEqual([]);
  });

  it('holds no apostrophe, which the shell reads as the end of the script', () => {
    const broken = scripts.flatMap((s) =>
      s.body.filter((l) => l.includes("'")).map((l) => `${s.file}:${s.line + 1 + s.body.indexOf(l)}: ${l.trim()}`));
    expect(broken).toEqual([]);
  });
});
