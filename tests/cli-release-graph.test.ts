// @vitest-environment node
// The release workflow's job graph, read as data: both workflows go through tests/lib/yaml.ts, so a job's `needs`, its
// `continue-on-error` and its steps' commands are values rather than lines to match.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseYaml } from './lib/yaml';
import { GATE_DEPTHS, STAGE_DEPTHS } from '../scripts/lib/browser-plan.ts';

type Step = { uses?: string; name?: string; run?: string; if?: string; 'continue-on-error'?: boolean; 'timeout-minutes'?: number; with?: Record<string, unknown> };
type Job = {
  needs?: string | string[];
  'continue-on-error'?: boolean;
  'timeout-minutes'?: number;
  strategy?: Record<string, unknown>;
  steps?: Step[];
  [key: string]: unknown;
};
type Workflow = { jobs: Record<string, Job> };

const read = (file: string): Workflow => parseYaml(fs.readFileSync(file, 'utf8')) as Workflow;

const release = read('.github/workflows/release.yml').jobs;
const weekly = read('.github/workflows/weekly.yml').jobs;
const SWEEPS = ['sweep-audit', 'sweep-interactions', 'sweep-keyboard', 'sweep-rest'];

/** A job's `needs` as a list, whether the workflow wrote it as a flow sequence or as one name. */
const needs = (job: Job): string[] => (Array.isArray(job.needs) ? job.needs : job.needs ? [job.needs] : []);
/** Every command a job's steps run. */
const runs = (job: Job): string => (job.steps ?? []).map((step) => step.run ?? '').join('\n');

describe('a release runs each check once', () => {
  it('runs the static stage, each sweep, deep and the consumer as their own jobs, each blocking publish', () => {
    const publish = release.publish;
    expect(publish).toBeDefined();
    for (const name of ['build', 'static', ...SWEEPS, 'deep', 'consumer']) {
      expect(release[name], name).toBeDefined();
      expect(needs(publish!), name).toContain(name);
    }
  });

  it('runs no whole release suite anywhere, and no second full suite in the created project', () => {
    for (const [name, job] of Object.entries(release)) expect(runs(job), name).not.toMatch(/test:release|test-run\.ts release/);
    expect(runs(release.consumer!)).not.toMatch(/--created-release/);
    expect(runs(release.consumer!)).toMatch(/--created-rest/);
  });

  it('lets no timing value fail the release or hold its tag', () => {
    expect(release.tier2!['continue-on-error']).toBe(true);
    expect(needs(release.publish!)).not.toContain('tier2');
    expect(needs(release.release!)).not.toContain('tier2');
    expect(needs(release['tier2-attach']!)).toEqual(expect.arrayContaining(['tier2', 'release']));
  });

  it('lets the deep job see the previous tag', () => {
    const checkout = (release.deep!.steps ?? []).find((step) => step.uses?.startsWith('actions/checkout@'));
    expect(checkout?.with?.['fetch-depth']).toBe(0);
    expect(release.deep!.strategy?.['fail-fast']).toBe(false);
  });

  it('has no weekly t2 job', () => {
    expect(weekly).not.toHaveProperty('t2');
  });
});

// The three workflow tests are the reader's cases, except two branches the workflows never take: an unreadable line,
// which the contract requires the reader to refuse by line number rather than return a partial tree, and a quote
// escaped inside a quoted scalar.
describe('the reader the workflows are read through', () => {
  it('refuses a line it cannot read, naming the line and its text', () => {
    expect(() => parseYaml('jobs:\n  build:\n    runs-on: ubuntu\n    this is not yaml\n')).toThrow(/^line 4: not a "key: value" line: "    this is not yaml"$/);
    expect(() => parseYaml('jobs:\n  build: 1\n   other: 2\n')).toThrow(/^line 3: unexpected indentation/);
  });

  it("reads a quote escaped with '' and keeps a block scalar's own lines", () => {
    const text = parseYaml("note: 'it''s here'\nrun: |\n  set -e\n  echo \"a: b\"\n");
    expect(text).toEqual({ note: "it's here", run: 'set -e\necho "a: b"\n' });
  });
});

describe('the 20-sample protocol, off the gate', () => {
  it('is its own non-blocking job, and no gate stage asks the browser for it', () => {
    // A gate that waits on a measurement fails for the wrong reason: measured on one product, the protocol took its push
    // gate from 1 h 47 m to 2 h 37 m against a 180-minute limit.
    expect(GATE_DEPTHS).not.toContain('perf');
    expect(STAGE_DEPTHS.tier2).not.toContain('perf');
    expect(STAGE_DEPTHS.perf).toBe('perf');
    const perf = release.perf;
    expect(perf, 'the release has a perf job').toBeDefined();
    expect(perf!['continue-on-error']).toBe(true);
    expect(needs(perf!)).toEqual(['build']);
    expect(runs(perf!)).toContain('stage perf');
    // It gates nothing: publish and the tag never wait for it.
    expect(needs(release.publish!)).not.toContain('perf');
    expect(needs(release.release!)).not.toContain('perf');
    // And the timed stage does not ask for the protocol it used to carry.
    expect(runs(release.tier2!)).not.toContain('stage perf');
    expect(runs(release.tier2!)).not.toContain('perf,');
  });

  it('still reaches the release comparison: the attach merges its record', () => {
    const attach = release['tier2-attach']!;
    expect(needs(attach)).toContain('perf');
    expect(runs(attach)).toContain('/tmp/perf/perf-record.json');
    expect(runs(attach)).toContain('merged.values');
  });

  it('is measured weekly on the quiet runner, where it cannot fail that job', () => {
    const step = (weekly.release!.steps ?? []).find((s) => (s.run ?? '').includes('stage perf'));
    expect(step, 'the weekly release runs the protocol').toBeDefined();
    expect(step!['continue-on-error']).toBe(true);
  });
});
