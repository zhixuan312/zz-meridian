// @vitest-environment node
// The browser stage refuses to press controls against a backend it cannot prove local, and reports every suite not run.
// That is a safety gate, so the reason must name the remedy exactly, and the adopt flow must say the same thing to the
// person who just adopted (issue shape: an adopter with no fakeApi/noLiveApi has no browser evidence and a frozen marker).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('the browser stage’s safety gate', () => {
  it('names both remedies where it reports: fakeApi or noLiveApi in the config, and a data URL pointed at a local backend', () => {
    const browser = read('scripts/browser.ts');
    expect(browser).toContain('set fakeApi or noLiveApi in scripts/verify.config.ts');
    expect(browser).toContain('point the data URL at a local backend');
  });

  it('tells the adopter the same in the adopt output and the skill’s step 5', () => {
    expect(read('cli/src/adopt.ts')).toContain('set fakeApi or noLiveApi in scripts/verify.config.ts first, and point a database URL at a local backend');
    const step = read('skills/zz-meridian/references/existing-project.md');
    expect(step).toContain('noLiveApi: true');
    expect(step).toMatch(/Point it at a local copy for the run/);
  });
});
