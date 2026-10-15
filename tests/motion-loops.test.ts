// @vitest-environment node
/**
 * The system allows three loops, and the token layer is what says so: `--dur-loop-spin`, `--dur-loop-shimmer` and
 * `--dur-loop-pulse`, one animation drawn per token in `src/styles/motion.css`. The prose that names them has disagreed
 * with that count before — three card specs said two loops where a Spinner's ring is a third (CHANGELOG, 0.15.0), and
 * the standard's own Motion floor and decision 0006 still did — so the count is held to the tokens here rather than
 * restated in each place and checked by eye.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const walk = (dir: string): string[] =>
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    return e.isDirectory() ? walk(rel) : e.name.endsWith('.md') ? [rel] : [];
  });

/** Every duration token named for a loop, as `motion.dur-loop-*`. */
const loopTokens = (): string[] => {
  const tokens = JSON.parse(read('tokens/core.tokens.json'));
  const found: string[] = [];
  const walkTokens = (node: Record<string, unknown>, at: string) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('dur-loop-')) found.push(`${at}${k}`);
      else if (v && typeof v === 'object' && !('$value' in v)) walkTokens(v as Record<string, unknown>, `${at}${k}.`);
    }
  };
  walkTokens(tokens, '');
  return found.sort();
};

describe('the loops the system allows', () => {
  it('are the three the token layer defines, each with a duration, and one animation each', () => {
    expect(loopTokens()).toEqual(['motion.dur-loop-pulse', 'motion.dur-loop-shimmer', 'motion.dur-loop-spin']);
    const css = read('src/styles/motion.css');
    for (const name of ['pulse', 'shimmer', 'spin']) expect(css, name).toMatch(new RegExp(`\\.${name} \\{[^}]*var\\(--dur-loop-${name}\\)`));
  });

  it('are all three named by the standard\'s Motion floor, which an agent is judged by', () => {
    const floor = /^\| Motion and response \|(.*)\|$/m.exec(read('skills/zz-meridian/references/standard.md'))?.[1] ?? '';
    for (const subject of ['spinner', 'skeleton', 'live dot']) expect(floor, subject).toContain(subject);
  });

  it('are counted the same way wherever the shipping documentation names them', () => {
    // The changelog is history and says what the count used to be; everything a reader of the system is given is here.
    const files = ['README.md', ...['skills', 'docs', 'decisions', 'src'].flatMap(walk)];
    for (const f of files) {
      const text = read(f);
      expect(text, f).not.toMatch(/\btwo loops\b/i);
      expect(text, f).not.toMatch(/\bone other loop\b/i);
    }
  });
});
