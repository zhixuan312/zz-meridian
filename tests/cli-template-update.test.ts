// @vitest-environment node
// Named cli-* so the payload leaves it out: it runs the package's own update, which no project carries.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256 } from '../cli/src/files.ts';
import { adoptSetOf } from '../cli/src/ownership.ts';
import { start, type Context, type Release } from '../cli/src/session.ts';
import { parseJournal } from '../cli/src/update-session.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const RECORDS = 'src/components/templates/records/index.tsx';
const LOADING = 'src/components/patterns/page-loading/index.tsx';
const CHROME = 'src/views/console-chrome.tsx';

const tmp: string[] = [];
afterEach(() => { for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });
const mk = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-template-update-')); tmp.push(d); return d; };
const put = (root: string, files: Record<string, string>) => {
  for (const [p, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), c); }
};
const read = (root: string, p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const git = (root: string, ...a: string[]) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...a], { cwd: root, encoding: 'utf8' });
function release(version: string, files: Record<string, string>): Release {
  const tree = mk();
  put(tree, files);
  return { version, payload: Object.keys(files).sort(), tree, hashes: new Map(Object.entries(files).map(([p, c]) => [p, sha256(c)])), agents: null, changelog: `# Changelog\n\n## [${version}]\n\n- A test release.\n`, pkg: {} };
}

describe('what a project is given, read from this tree', () => {
  const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  const managed = new Set(adoptSetOf(tracked));

  it('includes the page template, the page-loading card and the chrome', () => {
    for (const f of [RECORDS, LOADING, CHROME]) expect(managed.has(f), f).toBe(true);
  });

  it('leaves out every preview and card spec, and everything the team owns', () => {
    const ours = [...managed].filter((f) => /^src\/components\/.*\/(README\.md|preview\.tsx)$/.test(f) || /^(app|docs|src\/data|src\/system)\//.test(f) || f === 'src/app.config.ts' || (f.startsWith('src/views/') && f !== CHROME));
    expect(ours).toEqual([]);
  });
});

describe('an update that brings the template, the card and the new chrome', () => {
  // The project was made when the loading helpers were its own file under app/, and its pages still import them.
  const BASE = { [RECORDS]: 'records 1', [CHROME]: 'chrome 1' };
  const TARGET = {
    [RECORDS]: 'records 2', [CHROME]: 'chrome 2', [LOADING]: 'loading 2',
    'src/components/templates/records/preview.tsx': 'preview 2', 'src/components/templates/records/README.md': 'spec 2',
    'src/views/customers.tsx': 'the sample view 2', 'src/app.config.ts': 'the sample configuration 2', 'app/(dashboard)/customers/loading.tsx': 'the sample loading 2',
  };
  const TEAM = {
    'src/app.config.ts': 'our configuration', 'src/views/jobs.tsx': 'our view', 'app/(dashboard)/_loading.tsx': 'our loading helpers',
    'app/(dashboard)/jobs/loading.tsx': "import { LoadingPage } from '../_loading';", 'src/components/templates/records/preview.tsx': 'our preview',
  };

  it('writes what Meridian manages and leaves every file of the team as it was', () => {
    const root = mk();
    const recorded = Object.fromEntries(Object.entries(BASE).map(([p, c]) => [p, sha256(c)]));
    put(root, { ...BASE, ...TEAM, 'package.json': '{\n  "name": "team-app"\n}\n', '.meridian/manifest.json': JSON.stringify({ version: '0.14.0', route: 'create', brand: { name: 'Acme' }, files: recorded }, null, 2) + '\n' });
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'the team project');
    const base = release('0.14.0', BASE);
    const target = release('0.15.0', TARGET);
    const lines: string[] = [];
    const c: Context = { root, version: target.version, targetIntegrity: 'sha512-test', source: () => base, target: () => target, run: () => ({ status: 0, output: '' }), log: (l) => lines.push(l) };
    start(c, { dryRun: false, allowDirty: false, install: false, verbose: false });

    expect(read(root, RECORDS)).toBe('records 2');
    expect(read(root, CHROME)).toBe('chrome 2');
    expect(read(root, LOADING)).toBe('loading 2');
    for (const [p, content] of Object.entries(TEAM)) expect(read(root, p), p).toBe(content);
    for (const p of ['src/views/customers.tsx', 'app/(dashboard)/customers/loading.tsx', 'src/components/templates/records/README.md']) expect(fs.existsSync(path.join(root, p)), p).toBe(false);

    const journal = parseJournal(read(path.join(root, '.meridian/update/0.15.0'), 'state.json'));
    const by = Object.fromEntries(journal.operations.map((o) => [o.path, `${o.disposition}/${o.action}`]));
    expect(by).toMatchObject({ [RECORDS]: 'untouched/write', [CHROME]: 'untouched/write', [LOADING]: 'added/write' });
    expect(journal.operations.filter((o) => o.action === 'stage' || o.action === 'delete')).toEqual([]);
    expect(lines.join('\n')).toContain('0 conflicts');
  });
});
