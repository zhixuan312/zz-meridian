// @vitest-environment node
// The removed test entry points stay removed: no document, script, workflow or agent-facing text may name `pnpm verify`,
// `pnpm gate`, their scripts, or the `--full`, `--timed`, `--perf` and `--shard` flags. History keeps its text: the
// decision records, the dated evidence, the changelog and the migrations a past release shipped are about what was true
// then and are not rewritten. The planted lines prove the rule is not vacuous.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');

const DOCS = ['README.md', 'AGENTS.md', 'CONTRIBUTING.md', 'cli/README.md', 'docs/testing.md', 'docs/distribution.md', 'docs/benchmark.md', 'docs/agents.md', 'docs/start-a-dashboard.md', 'docs/atlas-scenario-coverage.md', 'docs/skill-evals.md', 'docs/data-display.md', 'docs/data-layers.md', 'docs/product-workspaces.md', 'docs/surfaces.md', 'docs/voice.md'];
const SCRIPTS = ['scripts/test-run.ts', 'scripts/brand.ts', 'scripts/verify.config.ts', 'scripts/audit.ts', 'scripts/interactions.ts', 'scripts/keyboard.ts', 'scripts/assistant.ts', 'scripts/live.ts', 'scripts/navigate.ts', 'scripts/vitals.ts', 'scripts/sizes.ts', 'scripts/shot.ts', 'scripts/route-policy.ts', 'cli/src/context.ts', 'cli/src/create.ts', 'cli/src/cli.ts', 'cli/src/session.ts', 'cli/scripts/smoke.ts'];
const WORKFLOWS = ['.github/workflows/release.yml', '.github/workflows/weekly.yml'];
const SKILLS = (() => {
  const walk = (rel: string): string[] => fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${rel}/${e.name}`) : e.name.endsWith('.md') ? [`${rel}/${e.name}`] : []);
  return walk('skills/zz-meridian');
})();

/** A line that names a removed entry point or flag. */
const STALE: [RegExp, string][] = [
  [/\bpnpm (?:verify|gate)\b/, 'names pnpm verify or pnpm gate'],
  [/\b(?:npm|yarn|bun) run (?:verify|gate)\b/, 'names a removed package script'],
  [/\b(?:scripts|node scripts)\/(?:verify|gate|perf)\.ts\b/, 'names a removed script'],
  [/`(?:verify|gate) --/, 'names a removed command with a flag'],
  [/--(?:full|timed|perf|shard)\b/, 'names a removed flag'],
  [/\btest:all\b/, 'names test:all'],
];

/** The stale claims in one file's text, each as `<file>:<line>: <what>`. */
export function stale(file: string, text: string): string[] {
  return text.split('\n').flatMap((line, i) => STALE.filter(([rule]) => rule.test(line)).map(([, what]) => `${file}:${i + 1}: ${what}`));
}

const files = [...DOCS, ...SCRIPTS, ...WORKFLOWS, ...SKILLS];

describe('no removed entry point is named', () => {
  it('outside the history', () => {
    const found = files.flatMap((f) => stale(f, fs.readFileSync(path.join(ROOT, f), 'utf8')));
    expect(found).toEqual([]);
  });

  it('fails, naming the line, on each planted claim', () => {
    expect(stale('x.md', 'pnpm verify runs the default path')).toEqual(['x.md:1: names pnpm verify or pnpm gate']);
    expect(stale('x.md', 'run pnpm gate before you commit')).toEqual(['x.md:1: names pnpm verify or pnpm gate']);
    expect(stale('x.md', 'node scripts/verify.ts --full')).toEqual(['x.md:1: names a removed script', 'x.md:1: names a removed flag']);
    expect(stale('x.md', 'use --timed on a quiet machine')).toEqual(['x.md:1: names a removed flag']);
    expect(stale('x.md', '`pnpm test:release` runs every test')).toEqual([]);
    expect(stale('x.md', '`pnpm test:t1` and `pnpm test:t2` take no arguments')).toEqual([]);
  });

  it('reads a skill reference and a workflow as files', () => {
    expect(files).toContain('skills/zz-meridian/SKILL.md');
    expect(files).toContain('.github/workflows/weekly.yml');
  });
});
