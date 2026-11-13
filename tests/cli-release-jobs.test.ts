// @vitest-environment node
// What the release workflow guarantees that its job graph does not: who holds a credential, that the consumer's
// failure output is kept, and that every job has a clock. The graph itself (which jobs exist, what each needs) is
// asserted by tests/cli-release-graph.test.ts. Both read the workflow through tests/lib/yaml.ts. Only `publish` may
// request the npm OIDC token; only `publish`, `release` and `tier2-attach` may write to the repository.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseYaml } from './lib/yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
type Step = { uses?: string; name?: string; run?: string; if?: string; with?: Record<string, unknown>; env?: Record<string, unknown> };
type Job = { environment?: unknown; permissions?: Record<string, string>; 'timeout-minutes'?: number; steps?: Step[]; [key: string]: unknown };

const jobs = (parseYaml(fs.readFileSync(path.join(ROOT, '.github/workflows/release.yml'), 'utf8')) as { jobs: Record<string, Job> }).jobs;
const publish = jobs.publish!;
const consumer = jobs.consumer!;
/** Everything a job's steps say, for a rule about a word none of them may hold. */
const said = (job: Job): string => JSON.stringify(job.steps ?? []);

describe('the release workflow', () => {
  it('gives the consumer no credential', () => {
    expect(consumer.environment).toBeUndefined();
    expect(consumer.permissions).toBeUndefined();
    expect(JSON.stringify(consumer)).not.toContain('id-token');
    expect(JSON.stringify(consumer)).not.toContain('secrets.');
  });

  it('lets no job but publish, release and tier2-attach hold id-token or contents: write', () => {
    for (const [name, job] of Object.entries(jobs)) {
      if (['publish', 'release', 'tier2-attach'].includes(name)) continue;
      expect(job.permissions?.['id-token'], name).not.toBe('write');
      expect(job.permissions?.contents, name).not.toBe('write');
      expect(said(job), name).not.toContain('id-token');
    }
    expect(publish.permissions?.['id-token']).toBe('write');
    expect(publish.environment).toBe('npm');
  });

  it("keeps a failed consumer run's own output, so a red names its cause", () => {
    const upload = (consumer.steps ?? []).find((step) => step.uses?.startsWith('actions/upload-artifact@'));
    expect(upload).toBeDefined();
    expect(upload!.if).toBe('always()');
    expect(upload!.with).toMatchObject({ name: 'consumer-test', path: 'out/', 'if-no-files-found': 'ignore' });
  });

  it('gives every job its own clock', () => {
    for (const [name, job] of Object.entries(jobs)) expect(typeof job['timeout-minutes'], name).toBe('number');
  });
});
