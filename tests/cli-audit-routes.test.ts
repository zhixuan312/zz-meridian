// @vitest-environment node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { expect, it } from 'vitest';

/**
 * A narrowed audit measures what it names, each as what it is. `--routes /,/embed/home` measured the embed as a page,
 * on no host's ground, so its ink read as failing contrast against a transparent page (1.13:1), and it ran every other
 * embed beside it, which the run never asked for. An embed in the list is measured as an embed, and only the embeds it
 * names run.
 */
const list = (...a: string[]) => spawnSync(process.execPath, ['scripts/audit.ts', ...a, '--list'], { cwd: path.resolve(import.meta.dirname, '..'), encoding: 'utf8' }).stdout.trim().split('\n');

it('measures the routes a list names, an embed once and as an embed', () => {
  expect(list('--routes', '/,/embed/home')).toEqual(['/', '/embed/home (embed)']);
  expect(list('--routes', '/requests')).toEqual(['/requests']);
});

it('measures every page and every embed when no list is given', () => {
  const all = list();
  expect(all).toContain('/');
  expect(all.filter((l) => l.endsWith(' (embed)')).length).toBeGreaterThan(0);
  expect(all.filter((l) => l.startsWith('/embed/') && !l.endsWith(' (embed)'))).toEqual([]);
});
