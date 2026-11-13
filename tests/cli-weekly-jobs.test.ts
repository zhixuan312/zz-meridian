// @vitest-environment node
// weekly's consumer job runs the same smoke as release.yml, and now runs a dashboard created from the tarball through
// its own `test:release` too: weekly never did, so the release's created-suite failure had no run that could reproduce
// it where publishing is impossible. The smoke writes a failed nested run's whole output into out/, which this job
// already uploads. The workflow is read through tests/lib/yaml.ts, so a job and its commands are values.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseYaml } from './lib/yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
type Step = { uses?: string; name?: string; run?: string; if?: string; with?: Record<string, unknown>; env?: Record<string, unknown> };
type Job = { needs?: string | string[]; if?: string; steps?: Step[]; [key: string]: unknown };
type Workflow = { jobs: Record<string, Job> };

const workflow = parseYaml(fs.readFileSync(path.join(ROOT, '.github/workflows/weekly.yml'), 'utf8')) as Workflow;
const jobs = workflow.jobs;
const consumer = jobs.consumer!;
/** Every command a job's steps run. */
const runs = (job: Job): string => (job.steps ?? []).map((step) => step.run ?? '').join('\n');
/** A job's `needs` as a list. */
const needs = (job: Job): string[] => (Array.isArray(job.needs) ? job.needs : job.needs ? [job.needs] : []);

describe('the weekly consumer job', () => {
  it('runs a dashboard created from the tarball through its own test:release', () => {
    expect(runs(consumer)).toContain('node cli/scripts/smoke.ts --tarball "$(ls /tmp/pack/zz-meridian-*.tgz)" --adopt --create --created-release --update --origins 3 --update-all --verify');
  });

  it('uploads out/, where a failed nested run is kept', () => {
    const upload = (consumer.steps ?? []).find((step) => step.uses?.startsWith('actions/upload-artifact@'));
    expect(upload).toBeDefined();
    expect(upload!.if).toBe('always()');
    expect(upload!.with).toMatchObject({ name: 'consumer', path: 'out/' });
  });

  it('has no t2 job, and its job list names only release and consumer', () => {
    expect(Object.keys(jobs).sort()).toEqual(['consumer', 'named', 'release']);
    for (const name of ['release', 'consumer']) expect(needs(jobs[name]!), name).toEqual(['named']);
    expect((jobs.named!.steps![0]!.env as Record<string, unknown>).JOBS).toBe("${{ inputs.jobs || 'release,consumer' }}");
    expect(runs(jobs.named!)).toContain('release|consumer) ;;');
    for (const name of ['release', 'consumer']) {
      expect(jobs[name]!.if, name).toBe(`contains(format(',{0},', inputs.jobs || 'release,consumer'), ',${name},')`);
    }
  });
});
