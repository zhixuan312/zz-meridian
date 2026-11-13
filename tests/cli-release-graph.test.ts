import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

/** A workflow's jobs and what each needs, read from its indentation: a job is a two-space key under `jobs:`; comment lines are skipped. */
function jobs(file: string): Map<string, { needs: string[]; body: string }> {
  const out = new Map<string, { needs: string[]; body: string }>();
  let inJobs = false;
  let current: string | null = null;
  let body: string[] = [];
  const close = () => {
    if (!current) return;
    const text = body.join('\n');
    const m = /^ {4}needs:\s*(.+)$/m.exec(text);
    const needs = m ? m[1].replace(/[[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean) : [];
    out.set(current, { needs, body: text });
  };
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (/^\s*#/.test(line)) continue;
    if (/^jobs:\s*$/.test(line)) { inJobs = true; continue; }
    if (!inJobs) continue;
    if (/^\S/.test(line)) { close(); current = null; inJobs = false; continue; }
    const job = /^ {2}([a-z0-9-]+):\s*$/.exec(line);
    if (job) { close(); current = job[1]; body = []; continue; }
    if (current) body.push(line);
  }
  close();
  return out;
}

const release = jobs('.github/workflows/release.yml');
const SWEEPS = ['sweep-audit', 'sweep-interactions', 'sweep-keyboard', 'sweep-rest'];

describe('a release runs each check once', () => {
  it('runs the static stage, each sweep, deep and the consumer as their own jobs, each blocking publish', () => {
    const publish = release.get('publish');
    expect(publish).toBeDefined();
    for (const j of ['build', 'static', ...SWEEPS, 'deep', 'consumer']) {
      expect(release.has(j), j).toBe(true);
      expect(publish!.needs, j).toContain(j);
    }
  });

  it('runs no whole release suite anywhere, and no second full suite in the created project', () => {
    for (const [name, job] of release) expect(job.body, name).not.toMatch(/test:release|test-run\.ts release/);
    expect(release.get('consumer')!.body).not.toMatch(/--created-release/);
    expect(release.get('consumer')!.body).toMatch(/--created-rest/);
  });

  it('lets no timing value fail the release or hold its tag', () => {
    expect(release.get('tier2')!.body).toMatch(/^ {4}continue-on-error:\s*true/m);
    expect(release.get('publish')!.needs).not.toContain('tier2');
    expect(release.get('release')!.needs).not.toContain('tier2');
    expect(release.get('tier2-attach')!.needs).toEqual(expect.arrayContaining(['tier2', 'release']));
  });

  it('lets the deep job see the previous tag', () => {
    expect(release.get('deep')!.body).toMatch(/fetch-depth:\s*0/);
    expect(release.get('deep')!.body).toMatch(/fail-fast:\s*false/);
  });

  it('has no weekly t2 job', () => {
    expect(jobs('.github/workflows/weekly.yml').has('t2')).toBe(false);
  });
});
