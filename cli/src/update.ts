/**
 * `update --dry-run`: replays the release the project was copied from and the running one, classifies every managed path
 * against the project, and prints what needs the team's decision. It writes nothing, and proves that it wrote nothing.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VERSION, inside, run, sha256, type Manifest } from './files.js';
import { classify, managedPaths, parseManifest, type Action, type Disposition, type Hash } from './ownership.js';
import { fetchRelease, replay, runningRelease } from './replay.js';

export type Row = { path: string; disposition: Disposition; action: Action };

const parts = (v: string) => v.split('.').map(Number);

/** True when `target` is a higher x.y.z than `source`, compared number by number. */
export function isNewer(target: string, source: string): boolean {
  const [t, s] = [parts(target), parts(source)];
  for (let i = 0; i < 3; i++) if (t[i] !== s[i]) return t[i] > s[i];
  return false;
}

/** True when a project on `version` has a manifest `update` can start from: 0.3.0 and later. */
export const supportsSource = (version: string) => !isNewer('0.3.0', version);

/** The report: the staged rows (every row with `verbose`), then the migrations, summary and outcome lines. */
export function formatReport(rows: Row[], { verbose }: { verbose: boolean }): string {
  const lines: string[] = [];
  const count = { untouched: 0, added: 0, removed: 0, 'team-preserved': 0 };
  let conflicts = 0;
  for (const r of rows) {
    const staged = r.action === 'stage';
    if (staged) conflicts++;
    else if (r.disposition === 'untouched' || r.disposition === 'edited') count.untouched++;
    else if (r.disposition === 'added' || r.disposition === 'removed' || r.disposition === 'team-preserved') count[r.disposition]++;
    if (verbose) lines.push(`${r.disposition.padEnd(15)}  ${r.path}  ${r.action}`);
    else if (staged) lines.push(`${r.disposition.padEnd(15)}  ${r.path}  ${r.disposition === 'local-deletion' ? 'decide: delete or restore' : 'merge required'}`);
  }
  lines.push('migrations: none declared');
  lines.push(`summary: ${conflicts} ${conflicts === 1 ? 'conflict' : 'conflicts'} · aggregated: untouched ${count.untouched}, added ${count.added}, removed ${count.removed}, team-preserved ${count['team-preserved']}`);
  lines.push('outcome: dry-run (nothing was written)');
  return lines.join('\n');
}

/** Every regular file under `<release>/payload` as posix paths, symbolic links never followed. */
function payloadList(release: string): string[] {
  const base = path.join(release, 'payload');
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(base, rel), { withFileTypes: true })) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(p);
    }
  };
  if (fs.existsSync(base)) walk('');
  return out.sort();
}

const SKIPPED = new Set(['.git', 'node_modules', '.next']);

/** One digest of every path, type and content in the project, outside .git, node_modules and .next. */
function treeDigest(root: string): string {
  const h = createHash('sha256');
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (!rel && SKIPPED.has(e.name)) continue;
      const p = rel ? `${rel}/${e.name}` : e.name;
      const abs = path.join(root, p);
      if (e.isDirectory()) { h.update(`d ${p}\n`); walk(p); }
      else if (e.isSymbolicLink()) h.update(`l ${p} ${fs.readlinkSync(abs)}\n`);
      else if (e.isFile()) h.update(`f ${p} ${sha256(fs.readFileSync(abs))}\n`);
      else h.update(`o ${p}\n`);
    }
  };
  walk('');
  return h.digest('hex');
}

/** git's view of the project, or null in a folder that is not a work tree. */
function gitState(root: string): { status: string; head: string } | null {
  const inTree = run('git', ['rev-parse', '--is-inside-work-tree'], root, true);
  if (inTree.status !== 0) return null;
  const status = run('git', ['status', '--porcelain'], root, true).stdout ?? '';
  const head = run('git', ['rev-parse', 'HEAD'], root, true);
  return { status, head: head.status === 0 ? head.stdout.trim() : '' };
}

/** The three views the no-change guard compares, recorded in this order: git status, HEAD, tree digest. */
const snapshot = (root: string) => ({ git: gitState(root), tree: treeDigest(root) });

/** The project file's hash, or null when it is absent. */
function diskHash(root: string, rel: string): Hash {
  const abs = inside(root, rel);
  const st = fs.lstatSync(abs, { throwIfNoEntry: false });
  return st?.isFile() ? (sha256(fs.readFileSync(abs)) as Hash) : null;
}

/** Prints one refusal and returns the exit code. */
const refuse = (cause: string) => { console.error(`zz-meridian update: ${cause}`); return 1; };

/** Computes the plan between the recorded release and the running one, prints it, and leaves the project exactly as found. */
export function update({ root, dryRun, verbose }: { root: string; dryRun: boolean; verbose: boolean }): number {
  if (!dryRun) return refuse('only --dry-run is available in this release of the update command');
  const manifestFile = path.join(root, '.meridian', 'manifest.json');
  if (!fs.existsSync(manifestFile)) return refuse('no .meridian/manifest.json here; run it in a project that adopted or created Meridian');
  let manifest: Manifest;
  try { manifest = parseManifest(fs.readFileSync(manifestFile, 'utf8')); } catch (e) { return refuse((e as Error).message); }
  if (!supportsSource(manifest.version)) return refuse(`updates start from 0.3.0; this project is on ${manifest.version}`);
  if (manifest.version === VERSION) return refuse(`already at ${VERSION}`);
  if (isNewer(manifest.version, VERSION)) return refuse(`this project is on ${manifest.version}, newer than this package (${VERSION}); run npx zz-meridian@latest update`);

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-meridian-update-'));
  try {
    const before = snapshot(root);
    const sub = (name: string) => { const d = path.join(scratch, name); fs.mkdirSync(d); return d; };
    const { pkgRoot } = fetchRelease(manifest.version, sub('fetch'));
    const baseHashes = replay(pkgRoot, manifest.route, manifest.brand, sub('base'));
    const targetRoot = runningRelease();
    const targetHashes = replay(targetRoot, manifest.route, manifest.brand, sub('target'));
    const managedOf = (release: string, hashes: Map<string, string>) => {
      const set = managedPaths(payloadList(release), manifest.route);
      if (hashes.has('scripts/package.json')) set.add('scripts/package.json');
      return set;
    };
    const baseManaged = managedOf(pkgRoot, baseHashes);
    const targetManaged = managedOf(targetRoot, targetHashes);

    const drift = Object.entries(manifest.files).filter(([p, h]) => baseManaged.has(p) && baseHashes.get(p) !== h).map(([p]) => p).sort();
    if (drift.length) return refuse(`the recorded files do not match a replay of ${manifest.version}, so nothing can be trusted; nothing was written:\n${drift.map((p) => `  ${p}`).join('\n')}`);

    const paths = [...new Set([...Object.keys(manifest.files), ...targetManaged])].sort();
    const rows: Row[] = paths.map((p) => ({
      path: p,
      ...classify({
        recorded: (manifest.files[p] ?? null) as Hash,
        target: (targetHashes.get(p) ?? null) as Hash,
        disk: diskHash(root, p),
        managed: baseManaged.has(p) || targetManaged.has(p),
      }),
    }));

    const after = snapshot(root);
    if (JSON.stringify(before) !== JSON.stringify(after)) return refuse('dry-run changed the project');
    const dirty = before.git ? before.git.status.split('\n').filter(Boolean).length : 0;
    if (dirty) console.log(`note: the git tree has uncommitted changes (${dirty} paths); a real update will refuse until they are committed (or pass --allow-dirty)\n`);
    console.log(formatReport(rows, { verbose }));
    return 0;
  } catch (e) {
    return refuse((e as Error).message);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
