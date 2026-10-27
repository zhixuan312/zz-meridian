// @vitest-environment node
// Named cli-* so the payload leaves it out: it copies the template's own tracked files.
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * A managed file the team changed and named nowhere is said by the gate, not first by the next update. Between releases
 * nothing else compared a project's managed files with the hashes `.meridian/manifest.json` records, so an edit nobody
 * recorded a reason for met the team months later, as a question in an update. `node scripts/check.ts` prints a `drift:`
 * line naming each managed file whose bytes are not the release's and that `.meridian/keep.json` does not keep, and the
 * gate carries it; it is a warning, never a problem.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-drift-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
for (const f of execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((x) => x && !x.startsWith('cli/'))) {
  const src = path.join(ROOT, f);
  if (!fs.lstatSync(src, { throwIfNoEntry: false })?.isFile()) continue;
  fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
  fs.copyFileSync(src, path.join(dir, f));
}
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
const check = () => spawnSync(process.execPath, ['scripts/check.ts'], { cwd: dir, encoding: 'utf8' });
const hash = (f: string) => `sha256-${createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex')}`;
const put = (f: string, text: string) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); };

const SAME = 'src/lib/format.ts';
const KEPT = 'src/components/ui/badge/index.tsx';
const EDITED = 'src/components/ui/card/index.tsx';
const GONE = 'src/components/ui/kbd/index.tsx';
const manifest = (files: string[]) => JSON.stringify({ version: '0.31.2', route: 'create', brand: {}, files: Object.fromEntries(files.map((f) => [f, hash(f)])) }, null, 2);

describe('the managed files a team changed and named nowhere', () => {
  it('are named, apart from the unchanged and the kept, and fail nothing', () => {
    put('.meridian/manifest.json', manifest([SAME, KEPT, EDITED, GONE]));
    put('.meridian/keep.json', JSON.stringify([{ path: KEPT, reason: 'our own badge' }]));
    put(KEPT, `${fs.readFileSync(path.join(dir, KEPT), 'utf8')}\n// ours\n`);
    put(EDITED, `${fs.readFileSync(path.join(dir, EDITED), 'utf8')}\n// ours too\n`);
    fs.rmSync(path.join(dir, GONE));
    const r = check();
    const line = r.stdout.split('\n').find((l) => l.startsWith('drift: ')) ?? '';
    expect(line, r.stdout).toContain('2 managed files differ from the release and are not in .meridian/keep.json');
    expect(line).toContain(EDITED);
    expect(line).toContain(`${GONE} (missing)`);
    expect(line).not.toContain(KEPT);
    expect(line).not.toContain(SAME);
    // The next update tells a file whose imports are only spelled differently from one the team changed; this cannot.
    expect(line).toMatch(/imports/);
    expect(r.stdout).not.toMatch(/card\/index\.tsx: /);
  }, 60_000);

  it('says nothing when every managed file is the release or kept', () => {
    put('.meridian/manifest.json', manifest([SAME, KEPT]));
    expect(check().stdout).not.toMatch(/^drift: /m);
  }, 60_000);

  it('is carried by the gate to its last lines', () => {
    const text = fs.readFileSync(path.join(ROOT, 'scripts/gate.ts'), 'utf8');
    expect(text).toMatch(/\^drift: /);
  });
});
