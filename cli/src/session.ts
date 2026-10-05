/**
 * The update engine. `start` plans the update from the recorded release to the running one, persists the plan, then
 * applies what is safe: untouched replacements, additions and untouched removals. Everything the team changed is staged
 * with exact base, ours and new copies, and a `MERGE.md` says what to decide. The project is never written before the
 * plan, the report, the copies and the preimages are on disk, and every write is checked against its preimage first.
 */
import fs from 'node:fs';
import path from 'node:path';
import { managedBlock } from './context.js';
import { inside, packageManager, run as spawn, sha256 } from './files.js';
import { renderMergeReport } from './merge-report.js';
import { releaseMigrations } from './migrations.js';
import { classify, managedPaths, parseManifest } from './ownership.js';
import { legacySection, needOf, planAgents, reconcilePackage } from './reconcile.js';
import { dirtyNote, formatReport, isNewer, supportsSource } from './update.js';
import {
  isSafePath, keepProblems, parseJournal, parseKeep, planHash, verifiedRetirements,
  type FileOperation, type FileSide, type Hash, type KeepEntry, type Manifest, type Migration, type Retirement, type UpdateJournal,
} from './update-session.js';

export type Release = {
  version: string;
  payload: string[];
  tree: string;
  hashes: Map<string, string>;
  agents: string | null;
  changelog: string;
  pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> };
};
export type Run = (cmd: string, args: string[], cwd: string) => { status: number; output: string };
export type Context = {
  root: string;
  version: string;
  targetIntegrity: string;
  source: (m: Manifest) => Release;
  target: (m: Manifest) => Release;
  run: Run;
  log: (line: string) => void;
  interruptAfter?: number;
};
export type StartOptions = { dryRun: boolean; allowDirty: boolean; install: boolean; verbose: boolean };

/** A cause the update refuses for, before it writes anything. */
class Refusal extends Error {}

const ABSENT: FileSide = { exists: false, hash: null };
const sha = (content: string | Buffer) => sha256(content) as Hash;
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const compact = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Anything that must never be copied into a session or planned as an update target. */
const FORBIDDEN = /(^|\/)(\.git|node_modules)(\/|$)|(^|\/)\.env/;

/** Writes through a sibling temporary file and a rename, so a reader never sees half a file. */
export function writeAtomic(abs: string, data: string | Buffer, mode?: number) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.zz-tmp`;
  fs.writeFileSync(tmp, data);
  if (mode !== undefined) fs.chmodSync(tmp, mode);
  fs.renameSync(tmp, abs);
}

/** What the project holds at `rel`: its hash, or `unsafe` when a symbolic link or a non-file is in the way. */
function probe(root: string, rel: string): { side: FileSide; unsafe: boolean } {
  let abs: string;
  try { abs = inside(root, rel); } catch { return { side: ABSENT, unsafe: true }; }
  const st = fs.lstatSync(abs, { throwIfNoEntry: false });
  if (!st) return { side: ABSENT, unsafe: false };
  if (!st.isFile()) return { side: ABSENT, unsafe: true };
  return { side: { exists: true, hash: sha(fs.readFileSync(abs)) }, unsafe: false };
}

const readText = (root: string, rel: string): string | null => {
  const p = probe(root, rel);
  return p.side.exists ? fs.readFileSync(path.join(root, rel), 'utf8') : null;
};

const sameSide = (a: FileSide, b: FileSide) => a.exists === b.exists && a.hash === b.hash;
const sideOf = (hash: string | null | undefined): FileSide => (hash ? { exists: true, hash: hash as Hash } : ABSENT);

const LOCKFILES = { pnpm: 'pnpm-lock.yaml', yarn: 'yarn.lock', npm: 'package-lock.json', bun: 'bun.lock' } as const;

function lockfileFor(root: string, pm: keyof typeof LOCKFILES): string {
  return pm === 'bun' && fs.existsSync(path.join(root, 'bun.lockb')) && !fs.existsSync(path.join(root, 'bun.lock')) ? 'bun.lockb' : LOCKFILES[pm];
}

const pidAlive = (pid: number) => {
  try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === 'EPERM'; }
};

/** The phase of the one session folder under `.meridian/update/`, or a note when it cannot be read. */
function sessionState(root: string): { dir: string; phase: string; version: string } | null {
  const base = path.join(root, '.meridian', 'update');
  if (!fs.existsSync(base)) return null;
  const [first] = fs.readdirSync(base).sort();
  if (!first) return null;
  let phase = 'unreadable';
  try { phase = parseJournal(fs.readFileSync(path.join(base, first, 'state.json'), 'utf8')).phase; } catch { /* named as unreadable */ }
  return { dir: `.meridian/update/${first}`, phase, version: first };
}

/** The retirements that completed sessions recorded, each checked against the manifest that session started from. */
function historicalRetirements(root: string): Retirement[] {
  const base = path.join(root, '.meridian', 'history');
  const out: Retirement[] = [];
  if (!fs.existsSync(base)) return out;
  for (const v of fs.readdirSync(base)) {
    const dir = path.join(base, v);
    if (!fs.lstatSync(dir).isDirectory()) continue;
    for (const id of fs.readdirSync(dir)) {
      try {
        const j = parseJournal(fs.readFileSync(path.join(dir, id, 'state.json'), 'utf8'));
        if (j.phase === 'complete') out.push(...verifiedRetirements(j));
      } catch { /* a history entry that is not a readable journal retires nothing */ }
    }
  }
  return out;
}

/** The files of the target's managed `.ts` and `.tsx` modules, for the import scan. */
function managedSources(target: Release, managed: ReadonlySet<string>): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of managed) {
    if (!/\.tsx?$/.test(p) || !target.hashes.has(p)) continue;
    out.set(p, fs.readFileSync(inside(target.tree, p), 'utf8'));
  }
  return out;
}

type Plan = { journal: UpdateJournal; missingKept: string[]; texts: Map<string, string>; source: Release; target: Release };

/** Everything the update will do, decided from the recorded release, the running one and the project as it is now. */
function plan(ctx: Context, manifest: Manifest, startedAt: Date): Plan {
  const { root } = ctx;
  let keep: KeepEntry[] = [];
  const keepFile = path.join(root, '.meridian', 'keep.json');
  if (fs.existsSync(keepFile)) {
    try { keep = parseKeep(fs.readFileSync(keepFile, 'utf8')); } catch (e) { throw new Refusal((e as Error).message); }
  }
  const history = historicalRetirements(root);

  const source = ctx.source(manifest);
  const target = ctx.target(manifest);
  const baseManaged = managedPaths(source.payload, manifest.route, [...source.hashes.keys()]);
  const targetManaged = managedPaths(target.payload, manifest.route, [...target.hashes.keys()]);

  const drift = Object.entries(manifest.files).filter(([p, h]) => baseManaged.has(p) && source.hashes.get(p) !== h).map(([p]) => p).sort();
  if (drift.length) throw new Refusal(`the recorded files do not match a replay of ${manifest.version}, so nothing can be trusted; nothing was written:\n${drift.map((p) => `  ${p}`).join('\n')}`);

  const invalid = keepProblems(keep, { managed: new Set([...baseManaged, ...targetManaged]), retired: history, exists: () => true });
  if (invalid.length) throw new Refusal(`invalid keep entry; nothing was written:\n${invalid.map((p) => `  ${p}`).join('\n')}`);
  const keptReason = new Map(keep.map((k) => [k.path, k.reason]));
  const missingKept = keep.filter((k) => !probe(root, k.path).side.exists).map((k) => k.path);

  const paths = [...new Set([...Object.keys(manifest.files), ...targetManaged, ...keep.map((k) => k.path)])].sort(compact);
  for (const p of paths) if (!isSafePath(p) || FORBIDDEN.test(p)) throw new Refusal(`unsafe path ${JSON.stringify(p)}; nothing was written`);
  const sourcePayload = new Set(source.payload);

  const operations: FileOperation[] = [];
  const retired: Retirement[] = [];
  const targetFiles: Record<string, string> = {};
  for (const p of paths) {
    const inBase = baseManaged.has(p);
    const inTarget = targetManaged.has(p);
    const managed = inBase || inTarget;
    const recorded = manifest.files[p] ?? (inBase && !sourcePayload.has(p) ? source.hashes.get(p) : undefined) ?? null;
    const targetHash = inTarget ? target.hashes.get(p) ?? null : null;
    if (targetHash) targetFiles[p] = targetHash;
    const disk = probe(root, p);
    if (disk.unsafe && (managed || keptReason.has(p))) throw new Refusal(`${p} is a symbolic link or not a regular file; nothing was written`);
    const { disposition, action } = classify({ recorded: recorded as Hash | null, target: targetHash as Hash | null, disk: disk.side.hash, managed, kept: keptReason.has(p) });
    operations.push({ path: p, disposition, action, base: sideOf(recorded), ours: disk.side, target: sideOf(targetHash), applied: false, appliedHash: null });
    if (disposition === 'retired-kept') retired.push({ path: p, baselineHash: recorded as Hash, reason: keptReason.get(p)! });
  }

  // The shared files: only the planned edit is ever written, and only to the team's current text.
  const texts = new Map<string, string>();
  const migrations: Migration[] = [];
  const template = target.pkg;
  const need = needOf(template, managedSources(target, targetManaged));
  const shared = (rel: string, text: string | null) => {
    if (text === null) return;
    const ours = probe(root, rel);
    if (ours.unsafe) throw new Refusal(`${rel} is a symbolic link or not a regular file; nothing was written`);
    texts.set(rel, text);
    operations.push({ path: rel, disposition: 'team-preserved', action: 'write', base: ours.side, ours: ours.side, target: sideOf(sha(text)), applied: false, appliedHash: null });
  };
  const pkg = reconcilePackage(readText(root, 'package.json') ?? '', template, need, source.pkg);
  shared('package.json', pkg.text);
  migrations.push(...pkg.migrations);
  const agents = planAgents(readText(root, 'AGENTS.md'), managedBlock(ctx.version, packageManager(root)), legacySection(source.agents, manifest.route));
  shared('AGENTS.md', agents.text);
  if (agents.migration) migrations.push(agents.migration);
  migrations.push(...releaseMigrations(root, manifest.version, ctx.version));
  operations.sort((a, b) => compact(a.path, b.path));

  const journal: UpdateJournal = {
    id: startedAt.toISOString().replace(/[-:.]/g, ''),
    sourceVersion: manifest.version,
    targetVersion: ctx.version,
    route: manifest.route,
    originalManifest: manifest,
    targetManifest: { version: ctx.version, route: manifest.route, brand: manifest.brand, files: targetFiles },
    targetIntegrity: ctx.targetIntegrity,
    planHash: 'sha256-' as Hash,
    phase: 'prepared',
    operations, migrations, retired, validation: [], failure: null,
  };
  journal.planHash = planHash(journal);
  return { journal, missingKept, texts, source, target };
}

/** The staged copies, the new files and the preimages: everything the session folder holds besides state and the report. */
function persistCopies(ctx: Context, session: string, p: Plan) {
  const source = p.source;
  const copy = (folder: string, rel: string, bytes: string | Buffer) => writeAtomic(path.join(session, folder, rel), bytes);
  const checked = (bytes: Buffer, want: Hash | null, what: string) => {
    if (sha(bytes) !== want) throw new Refusal(`${what} does not match its recorded hash; nothing was written`);
    return bytes;
  };
  for (const o of p.journal.operations) {
    const changes = o.action === 'write' || o.action === 'delete';
    if (o.action === 'stage' && o.base.exists) copy('base', o.path, checked(fs.readFileSync(inside(source.tree, o.path)), o.base.hash, `the replayed base ${o.path}`));
    if ((o.action === 'stage' || changes) && o.ours.exists) {
      const bytes = checked(fs.readFileSync(inside(ctx.root, o.path)), o.ours.hash, `${o.path} in the project`);
      if (o.action === 'stage') copy('ours', o.path, bytes);
      if (changes) copy('backup', o.path, bytes);
    }
    if (o.target.exists && (changes || o.action === 'stage' || o.disposition === 'kept')) {
      const text = p.texts.get(o.path);
      copy('new', o.path, text ?? checked(fs.readFileSync(inside(p.target.tree, o.path)), o.target.hash, `the target ${o.path}`));
    }
  }
}

type Outcome = 'dry-run' | 'migration-required' | 'install-pending' | 'ready-to-finalize' | 'failed';

export function start(ctx: Context, o: StartOptions): number {
  const { root, log } = ctx;
  const refuse = (cause: string) => { log(`zz-meridian update: ${cause}`); return 1; };
  const lockFile = path.join(root, '.meridian', 'update.lock');
  let locked = false;
  try {
    const t0 = performance.now();
    const manifestFile = path.join(root, '.meridian', 'manifest.json');
    if (!fs.existsSync(manifestFile)) return refuse('no .meridian/manifest.json here; run it in a project that adopted or created Meridian');
    const manifest = parseManifest(fs.readFileSync(manifestFile, 'utf8'));
    for (const p of Object.keys(manifest.files)) if (!isSafePath(p)) return refuse(`manifest path ${JSON.stringify(p)} is not a safe project-relative path`);
    if (!supportsSource(manifest.version)) return refuse(`updates start from 0.3.0; this project is on ${manifest.version}`);
    if (!/^\d+\.\d+\.\d+$/.test(ctx.version)) return refuse(`the running version ${JSON.stringify(ctx.version)} must look like 1.2.3`);
    if (!isNewer(ctx.version, manifest.version)) {
      return refuse(manifest.version === ctx.version ? `already at ${ctx.version}` : `this project is on ${manifest.version}, newer than this package (${ctx.version}); run npx zz-meridian@latest update`);
    }

    const git = spawn('git', ['status', '--porcelain'], root, true);
    const dirty = git.status === 0 ? (git.stdout ?? '').split('\n').filter(Boolean).length : 0;
    if (o.dryRun) {
      if (dirty) { log(dirtyNote(dirty)); }
    } else {
      const active = sessionState(root);
      if (fs.existsSync(lockFile)) {
        let who = 'unreadable';
        try { const l = JSON.parse(fs.readFileSync(lockFile, 'utf8')); who = `pid ${l.pid}, ${pidAlive(l.pid) ? 'running' : 'not running (stale)'}`; } catch { /* named as unreadable */ }
        return refuse(`.meridian/update.lock exists (${who}; session phase: ${active?.phase ?? 'none'}). Another update is running or was killed. Nothing was changed; the lock is never deleted for you. ${active ? `Run npx zz-meridian@${active.version} update --resume to continue it, or --abort.` : 'Remove the lock only after checking no update is running.'}`);
      }
      if (active) return refuse(`an update session is already active at ${active.dir} (phase ${active.phase}); run npx zz-meridian@${active.version} update --resume, --finalize or --abort`);
      if (dirty && !o.allowDirty) return refuse(`the git tree has uncommitted changes (${dirty} ${dirty === 1 ? 'path' : 'paths'}); commit them or pass --allow-dirty`);
      try {
        fs.writeFileSync(lockFile, `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`, { flag: 'wx' });
        locked = true;
      } catch { return refuse('.meridian/update.lock was created by another update meanwhile; nothing was changed'); }
    }

    const startedAt = new Date();
    const p = plan(ctx, manifest, startedAt);
    const planned = performance.now() - t0;
    const j = p.journal;
    const pm = packageManager(root);
    const hashOf = (rel: string) => probe(root, rel).side.hash;
    const staged = j.operations.filter((x) => x.action === 'stage');
    const pending = staged.length + j.migrations.length > 0;
    const sessionRel = `.meridian/update/${j.targetVersion}`;
    const keepWarnings = p.missingKept.map((k) => `${k}: kept file is missing; update never recreates it. Restore it or remove it from .meridian/keep.json.`);

    const print = (outcome: Outcome, times: string, next: string) => {
      for (const line of formatReport(j.operations.map((x) => ({ path: x.path, disposition: x.disposition, action: x.action })), { verbose: o.verbose }).split('\n')) {
        if (line.startsWith('summary:')) {
          for (const w of keepWarnings) log(`kept             ${w}`);
          for (const x of j.operations.filter((y) => y.disposition === 'retired-kept')) log(`retired-kept     ${x.path}  left in place; the new release removed it`);
          for (const m of j.migrations) log(`migration  ${m.id}  pending`);
        }
        log(line);
      }
      log(`time: ${times}`);
      log(`outcome: ${outcome}${outcome === 'dry-run' ? ' (nothing was written)' : ''}`);
      log(`Next: ${next}`);
    };
    const pinned = (flag: string) => `npx zz-meridian@${j.targetVersion} update ${flag}`;

    if (o.dryRun) {
      print('dry-run', `plan ${secs(planned)}`, `${pinned('').trimEnd()} (from a clean git tree)`);
      return 0;
    }

    // Persist the plan: state, report, resolutions, staged copies and preimages. The project is not yet touched.
    const session = inside(root, sessionRel);
    const write = (outcome: Outcome) => writeAtomic(path.join(session, 'MERGE.md'), renderMergeReport({ journal: j, session: sessionRel, outcome, pm, keepWarnings, changelog: p.target.changelog, hashOf }));
    const persist = () => writeAtomic(path.join(session, 'state.json'), `${JSON.stringify(j, null, 2)}\n`);
    fs.mkdirSync(session, { recursive: true });
    persist();
    fs.mkdirSync(path.join(session, 'evidence'), { recursive: true });
    writeAtomic(path.join(session, 'resolutions.json'), '[]\n');
    persistCopies(ctx, session, p);
    write(pending ? 'migration-required' : o.install ? 'ready-to-finalize' : 'install-pending');

    // Apply.
    const tApply = performance.now();
    j.phase = 'applying';
    persist();
    let applied = 0;
    let failure: string | null = null;
    try {
      for (const op of j.operations) {
        if (op.action !== 'write' && op.action !== 'delete') continue;
        const now = probe(root, op.path);
        if (now.unsafe || !sameSide(now.side, op.ours)) { failure = `${op.path} changed since the plan was made; nothing was written for it`; break; }
        const abs = inside(root, op.path);
        if (op.action === 'delete') {
          fs.unlinkSync(abs);
          op.appliedHash = null;
        } else {
          const bytes = fs.readFileSync(path.join(session, 'new', op.path));
          if (sha(bytes) !== op.target.hash) { failure = `the staged new/${op.path} does not match the plan; nothing was written for it`; break; }
          writeAtomic(abs, bytes, op.ours.exists ? fs.statSync(abs).mode : undefined);
          op.appliedHash = op.target.hash;
        }
        op.applied = true;
        persist();
        if (++applied === ctx.interruptAfter) {
          log(`note: interrupted after ${applied} applied ${applied === 1 ? 'operation' : 'operations'} (ZZ_MERIDIAN_TEST_INTERRUPT_AFTER); ${pinned('--resume')} continues`);
          return 1;
        }
      }
    } catch (e) {
      failure = (e as Error).message;
    }
    const applyMs = performance.now() - tApply;
    if (failure) return failed(failure, `plan ${secs(planned)} · apply ${secs(applyMs)}`);

    // Install, through the project's own package manager; the lockfile it changes is journaled like any other write.
    let installMs = 0;
    let installNote = 'install skipped';
    if (o.install) {
      const lock = lockfileFor(root, pm);
      const before = probe(root, lock);
      const backup = path.join(session, 'backup', lock);
      if (before.side.exists) writeAtomic(backup, fs.readFileSync(inside(root, lock)));
      const tInstall = performance.now();
      const r = ctx.run(pm, ['install'], root);
      installMs = performance.now() - tInstall;
      installNote = `install ${secs(installMs)}`;
      writeAtomic(path.join(session, 'evidence', '0-install.log'), r.output);
      j.validation.push({ command: `${pm} install`, exitCode: r.status, evidenceFile: 'evidence/0-install.log' });
      const after = probe(root, lock);
      if (after.side.exists && !sameSide(before.side, after.side)) {
        j.operations.push({ path: lock, disposition: 'team-preserved', action: 'write', base: before.side, ours: before.side, target: after.side, applied: true, appliedHash: after.side.hash });
        j.operations.sort((a, b) => compact(a.path, b.path));
        j.planHash = planHash(j);
      }
      if (r.status !== 0) return failed(`${pm} install exited with ${r.status}; see evidence/0-install.log`, `plan ${secs(planned)} · apply ${secs(applyMs)} · ${installNote}`);
    }

    j.phase = pending ? 'needs-resolution' : 'ready';
    persist();
    const outcome: Outcome = pending ? 'migration-required' : o.install ? 'ready-to-finalize' : 'install-pending';
    write(outcome);
    const times = `plan ${secs(planned)} · apply ${secs(applyMs)} · ${installNote}`;
    const next = pending
      ? `resolve the items in ${sessionRel}/MERGE.md, then ${pinned('--finalize')} (or ${pinned('--abort')})`
      : o.install ? `${pinned('--finalize')} (or ${pinned('--abort')})` : `${pinned('--resume')} to install, then ${pinned('--finalize')} (or ${pinned('--abort')})`;
    print(outcome, times, next);
    return 2;

    function failed(why: string, times: string): number {
      j.phase = 'failed';
      j.failure = why;
      persist();
      write('failed');
      log(`zz-meridian update: ${why}`);
      print('failed', times, `fix the cause, then ${pinned('--resume')} (or ${pinned('--abort')})`);
      return 1;
    }
  } catch (e) {
    return refuse((e as Error).message);
  } finally {
    if (locked) fs.rmSync(lockFile, { force: true });
  }
}
