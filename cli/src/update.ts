/**
 * `update`: wires the command line to the engine in `session.ts`. It builds the context (the recorded release and the
 * running one, replayed with the project's brand and shape), runs a dry-run or a real update, and proves that a dry-run
 * wrote nothing.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VERSION, run, sha256 } from './files.js';
import type { Action, Disposition } from './ownership.js';
import { fetchRelease, localRelease, replayRelease, runningRelease } from './replay.js';
import { abort, finalize, resume, start, type Context } from './session.js';

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

/** The staged rows (every row with `verbose`), then the summary line. */
export function formatReport(rows: Row[], { verbose }: { verbose: boolean }): string {
  const lines: string[] = [];
  const count = { untouched: 0, added: 0, removed: 0, 'team-preserved': 0, kept: 0 };
  let conflicts = 0;
  for (const r of rows) {
    const staged = r.action === 'stage';
    if (staged) conflicts++;
    else if (r.disposition === 'untouched' || r.disposition === 'edited') count.untouched++;
    else if (r.disposition === 'kept' || r.disposition === 'retired-kept') count.kept++;
    else if (r.disposition === 'added' || r.disposition === 'removed' || r.disposition === 'team-preserved') count[r.disposition]++;
    if (verbose) lines.push(`${r.disposition.padEnd(15)}  ${r.path}  ${r.action}`);
    else if (staged) lines.push(`${r.disposition.padEnd(15)}  ${r.path}  ${r.disposition === 'local-deletion' ? 'decide: delete or restore' : 'merge required'}`);
  }
  lines.push(`summary: ${conflicts} ${conflicts === 1 ? 'conflict' : 'conflicts'} · aggregated: untouched ${count.untouched}, added ${count.added}, removed ${count.removed}, team-preserved ${count['team-preserved']}, kept ${count.kept}`);
  return lines.join('\n');
}

/** The line a dry-run prints above the report when the work tree has uncommitted changes. */
export const dirtyNote = (n: number) => `note: the git tree has uncommitted changes (${n} ${n === 1 ? 'path' : 'paths'}); a real update will refuse until they are committed (or pass --allow-dirty)`;

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

/**
 * The identity of a package as it runs: a SHA-512 over every regular file under `dist/` and `payload/`, one
 * `<path>\0<sha256 hex>\n` line each in sorted order. `package.json` is left out because npm may rewrite it on install.
 */
export function packageDigest(dir: string): string {
  const files: string[] = [];
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const p = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) files.push(p);
    }
  };
  for (const top of ['dist', 'payload']) if (fs.existsSync(path.join(dir, top))) walk(top);
  const h = createHash('sha512');
  for (const f of files.sort()) h.update(`${f}\0${sha256(fs.readFileSync(path.join(dir, f))).slice('sha256-'.length)}\n`);
  return `sha512-${h.digest('base64')}`;
}

export type Mode = 'dry-run' | 'update' | 'resume' | 'finalize' | 'abort';
export type Flags = { verbose: boolean; allowDirty: boolean; install: boolean; verify: boolean };

/** Prints one refusal and returns the exit code. */
const refuse = (cause: string) => { console.error(`zz-meridian update: ${cause}`); return 1; };

/**
 * A published version must be exactly what the registry serves: its tarball's file digest equals this package's. An
 * unpublished version is local by definition and is told apart from an unreachable registry by npm's own E404.
 */
function checkPublished(version: string, digest: string, scratch: string, log: (l: string) => void) {
  const view = run('npm', ['view', `zz-meridian@${version}`, 'dist.integrity'], scratch, true);
  if (view.status === 0 && view.stdout.trim()) {
    fs.mkdirSync(path.join(scratch, 'published'));
    const { pkgRoot } = fetchRelease(version, path.join(scratch, 'published'));
    if (packageDigest(pkgRoot) !== digest) throw new Error(`the running package differs from zz-meridian@${version} on the registry; run npx zz-meridian@${version} update, or update with a version that is not published`);
  } else if (/E404|404 Not Found/.test(`${view.stdout}${view.stderr}`)) {
    log(`note: zz-meridian@${version} is not published; this package is treated as a local build (${digest.slice(0, 19)}…)`);
  } else {
    throw new Error(`could not check zz-meridian@${version} against the registry: ${`${view.stdout ?? ''}${view.stderr ?? ''}`.trim() || 'npm view failed'}`);
  }
}

/** Runs one `update` mode in the project at `root` and returns the exit code. */
export function update({ root, mode, flags }: { root: string; mode: Mode; flags: Flags }): number {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-meridian-update-'));
  const log = (line: string) => (line.startsWith('zz-meridian update:') ? console.error(line) : console.log(line));
  let n = 0;
  const sub = () => { const d = path.join(scratch, `r${n++}`); fs.mkdirSync(d); return d; };
  try {
    const digest = packageDigest(runningRelease());
    if (mode === 'update') checkPublished(VERSION, digest, scratch, log);
    const local = process.env.ZZ_MERIDIAN_LOCAL_RELEASES;
    const interrupt = process.env.ZZ_MERIDIAN_TEST_INTERRUPT_AFTER;
    if (interrupt && (mode === 'update' || mode === 'dry-run')) log('note: ZZ_MERIDIAN_TEST_INTERRUPT_AFTER is set; the update will stop after that many applied operations');
    const ctx: Context = {
      root,
      version: VERSION,
      targetIntegrity: digest,
      source: (m) => {
        const dir = sub();
        if (local) {
          log(`note: reading release ${m.version} from ${local} (ZZ_MERIDIAN_LOCAL_RELEASES), not from the registry`);
          return replayRelease(localRelease(local, m.version, dir).pkgRoot, m, sub());
        }
        return replayRelease(fetchRelease(m.version, dir).pkgRoot, m, sub());
      },
      target: (m) => replayRelease(runningRelease(), m, sub()),
      run: (cmd, args, cwd) => {
        const r = run(cmd, args, cwd, true);
        return { status: r.status ?? 1, output: `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? `\n${r.error.message}` : ''}` };
      },
      log,
      interruptAfter: interrupt ? Number(interrupt) : undefined,
    };
    // The session commands read the journal and its own copies: they replay nothing and never ask the registry.
    const replayed = (what: string) => () => { throw new Error(`${what} is not needed by --${mode}`); };
    if (mode === 'resume' || mode === 'finalize' || mode === 'abort') {
      const own: Context = { ...ctx, source: replayed('the recorded release'), target: replayed('the running release'), interruptAfter: undefined };
      if (mode === 'resume') return resume(own, { install: flags.install, verbose: flags.verbose });
      if (mode === 'finalize') return finalize(own, { verify: flags.verify });
      return abort(own);
    }
    if (mode === 'update') return start(ctx, { dryRun: false, allowDirty: flags.allowDirty, install: flags.install, verbose: flags.verbose });

    const before = snapshot(root);
    const code = start(ctx, { dryRun: true, allowDirty: true, install: false, verbose: flags.verbose });
    if (JSON.stringify(before) !== JSON.stringify(snapshot(root))) return refuse('dry-run changed the project');
    return code;
  } catch (e) {
    return refuse((e as Error).message);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
