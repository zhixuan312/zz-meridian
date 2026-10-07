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
import { aliasesOf, canonicalImports } from './imports.js';
import { changedPaths, takeInventory } from './inventory.js';
import { renderMergeReport } from './merge-report.js';
import { releaseMigrations } from './migrations.js';
import { classify, managedPaths, parseManifest } from './ownership.js';
import { legacySection, needOf, planAgents, reconcilePackage } from './reconcile.js';
import { dirtyNote, formatReport, isNewer, supportsSource } from './update.js';
import {
  isSafePath, keepProblems, parseJournal, parseKeep, parseResolutions, planHash, unresolved, verifiedRetirements,
  type FileOperation, type FileSide, type Hash, type KeepEntry, type Manifest, type Migration, type Retirement, type UpdateJournal, type ValidationResult,
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

/** Anything that must never be copied into a session or planned as an update target. `.env.example` holds no secret: 0.3.0 create recorded it. */
const FORBIDDEN = /(^|\/)(\.git|node_modules)(\/|$)|(^|\/)\.env(?!\.example$)/;

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
  const aliases = aliasesOf(readText(root, 'tsconfig.json'));

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
    // A managed module the team only re-styled (its imports named another way, nothing else changed) is untouched: the
    // release's copy replaces it instead of staging a merge nobody needs (issue #16).
    let diskHash = disk.side.hash;
    if (managed && recorded && diskHash && diskHash !== recorded && /\.(?:tsx?|jsx?|mjs)$/.test(p) && fs.existsSync(inside(source.tree, p))) {
      const ours = readText(root, p);
      const base = fs.readFileSync(inside(source.tree, p), 'utf8');
      if (ours !== null && canonicalImports(p, ours, aliases) === canonicalImports(p, base, aliases)) diskHash = recorded as Hash;
    }
    const { disposition, action } = classify({ recorded: recorded as Hash | null, target: targetHash as Hash | null, disk: diskHash, managed, kept: keptReason.has(p) });
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
export type ResumeOptions = { install: boolean; verbose: boolean };
export type FinalizeOptions = { verify: boolean };

const pin = (version: string, flag: string) => `npx zz-meridian@${version} update ${flag}`;

/** The conflict list, the migrations, the timings and, unless `next` is null, the outcome and the next command. */
function report(ctx: Context, j: UpdateJournal, o: { verbose: boolean; keepWarnings: string[] }, outcome: string, times: string, next: string | null) {
  const { log } = ctx;
  for (const line of formatReport(j.operations.map((x) => ({ path: x.path, disposition: x.disposition, action: x.action })), { verbose: o.verbose }).split('\n')) {
    if (line.startsWith('summary:')) {
      for (const w of o.keepWarnings) log(`kept             ${w}`);
      for (const x of j.operations.filter((y) => y.disposition === 'retired-kept')) log(`retired-kept     ${x.path}  left in place; the new release removed it`);
      for (const m of j.migrations) log(`migration  ${m.id}  pending`);
    }
    log(line);
  }
  log(`time: ${times}`);
  if (next === null) return;
  log(`outcome: ${outcome}${outcome === 'dry-run' ? ' (nothing was written)' : ''}`);
  log(`Next: ${next}`);
}

/** Runs the project's install, records it as the first validation result, and journals the lockfile change it makes. */
function install(ctx: Context, session: string, j: UpdateJournal, pm: keyof typeof LOCKFILES): { ms: number; failure: string | null } {
  const { root } = ctx;
  const lock = lockfileFor(root, pm);
  const prior = j.operations.find((o) => o.path === lock && o.disposition === 'team-preserved' && o.applied);
  const before = prior ? prior.base : probe(root, lock).side;
  const backup = path.join(session, 'backup', lock);
  if (before.exists && !fs.existsSync(backup)) writeAtomic(backup, fs.readFileSync(inside(root, lock)));
  const t0 = performance.now();
  const r = ctx.run(pm, ['install'], root);
  const ms = performance.now() - t0;
  writeAtomic(path.join(session, 'evidence', '0-install.log'), r.output);
  j.validation = [{ command: `${pm} install`, exitCode: r.status, evidenceFile: 'evidence/0-install.log' }, ...j.validation.filter((v) => !isInstall(v))];
  const after = probe(root, lock).side;
  if (after.exists && !sameSide(before, after)) {
    if (prior) {
      prior.target = after;
      prior.appliedHash = after.hash;
    } else {
      j.operations.push({ path: lock, disposition: 'team-preserved', action: 'write', base: before, ours: before, target: after, applied: true, appliedHash: after.hash });
      j.operations.sort((a, b) => compact(a.path, b.path));
    }
    j.planHash = planHash(j);
  }
  return { ms, failure: r.status === 0 ? null : `${pm} install exited with ${r.status}; see evidence/0-install.log` };
}

const isInstall = (v: ValidationResult) => v.command.endsWith(' install');

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

    const print = (outcome: Outcome, times: string, next: string) => report(ctx, j, { verbose: o.verbose, keepWarnings }, outcome, times, next);
    const pinned = (flag: string) => pin(j.targetVersion, flag);

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
      const r = install(ctx, session, j, pm);
      installMs = r.ms;
      installNote = `install ${secs(installMs)}`;
      if (r.failure) return failed(r.failure, `plan ${secs(planned)} · apply ${secs(applyMs)} · ${installNote}`);
    }

    j.phase = pending ? 'needs-resolution' : 'ready';
    persist();
    const outcome: Outcome = pending ? 'migration-required' : o.install ? 'ready-to-finalize' : 'install-pending';
    write(outcome);
    const times = `plan ${secs(planned)} · apply ${secs(applyMs)} · ${installNote}`;
    if (!pending && o.install) {
      // Nothing is left to decide and the install ran: finalize in this same command.
      report(ctx, j, { verbose: o.verbose, keepWarnings }, outcome, times, null);
      const loaded = loadSession(ctx);
      return typeof loaded === 'string' ? refuse(loaded) : finalizeLoaded(ctx, loaded);
    }
    const next = pending
      ? `resolve the items in ${sessionRel}/MERGE.md, then ${pinned('--finalize')} (or ${pinned('--abort')})`
      : `${pinned('--resume')} to install, then ${pinned('--finalize')} (or ${pinned('--abort')})`;
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

// ── Resume, finalize and abort ───────────────────────────────────────────────────────────────────────

type Loaded = { dir: string; rel: string; journal: UpdateJournal };

const FRAMEWORK = ['next', 'react', 'react-dom'];
const persistJournal = (l: Loaded) => writeAtomic(path.join(l.dir, 'state.json'), `${JSON.stringify(l.journal, null, 2)}\n`);

/** The manifest file as it is written: sorted files, two-space indent, a final newline. */
function serializeManifest(m: Manifest): string {
  const files = Object.fromEntries(Object.entries(m.files).sort(([a], [b]) => a.localeCompare(b)));
  return `${JSON.stringify({ ...m, files }, null, 2)}\n`;
}

/**
 * The one session of this project, when it belongs to the running version and package. This is the only check resume,
 * finalize and abort share; a string is the reason to refuse.
 */
function loadSession(ctx: Context): Loaded | string {
  const base = path.join(ctx.root, '.meridian', 'update');
  const names = fs.existsSync(base) ? fs.readdirSync(base).filter((n) => fs.lstatSync(path.join(base, n)).isDirectory()).sort() : [];
  if (names.length === 0) return 'there is no update session in .meridian/update/; start one with npx zz-meridian@latest update';
  if (names.length > 1) return `.meridian/update/ holds ${names.length} sessions (${names.join(', ')}); finish or abort all but one by hand`;
  const rel = `.meridian/update/${names[0]}`;
  let journal: UpdateJournal;
  try { journal = parseJournal(fs.readFileSync(path.join(base, names[0]!, 'state.json'), 'utf8')); } catch (e) { return `${rel}/state.json cannot be used: ${(e as Error).message}`; }
  if (journal.targetVersion !== names[0]) return `${rel}/state.json names target ${journal.targetVersion}, not ${names[0]}`;
  if (journal.targetVersion !== ctx.version || journal.targetIntegrity !== ctx.targetIntegrity) {
    return `this session belongs to zz-meridian@${journal.targetVersion} (package ${journal.targetIntegrity.slice(0, 19)}…), not to the running ${ctx.version} (${ctx.targetIntegrity.slice(0, 19)}…); run it as npx zz-meridian@${journal.targetVersion} update --resume, --finalize or --abort`;
  }
  return { dir: path.join(base, names[0]!), rel, journal };
}

/** Takes `.meridian/update.lock`; a string is the reason it could not. Only resume takes over a lock that is stale. */
function acquire(root: string, takeover: boolean, version: string): string | null {
  const file = path.join(root, '.meridian', 'update.lock');
  if (fs.existsSync(file)) {
    let pid: unknown = null;
    try { pid = JSON.parse(fs.readFileSync(file, 'utf8')).pid; } catch { /* an unreadable lock is stale */ }
    if (typeof pid === 'number' && pidAlive(pid)) return `.meridian/update.lock is held by pid ${pid}, which is running; another update is in progress`;
    if (!takeover) return `.meridian/update.lock was left by an update that is not running (pid ${pid ?? 'unreadable'}); run ${pin(version, '--resume')}, which takes it over after checking the session`;
    fs.rmSync(file, { force: true });
  }
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`, { flag: 'wx' });
  } catch { return '.meridian/update.lock was created by another update meanwhile; nothing was changed'; }
  return null;
}

function command(ctx: Context, takeover: boolean, body: (l: Loaded) => number): number {
  let locked = false;
  try {
    const l = loadSession(ctx);
    if (typeof l === 'string') { ctx.log(`zz-meridian update: ${l}`); return 1; }
    const why = acquire(ctx.root, takeover, l.journal.targetVersion);
    if (why) { ctx.log(`zz-meridian update: ${why}`); return 1; }
    locked = true;
    return body(l);
  } catch (e) {
    ctx.log(`zz-meridian update: ${(e as Error).message}`);
    return 1;
  } finally {
    if (locked) fs.rmSync(path.join(ctx.root, '.meridian', 'update.lock'), { force: true });
  }
}

/** Updates the phase, outcome and failure lines of `MERGE.md` in place; the rest of the report is left as written. */
function patchReport(l: Loaded, outcome: string, coverage: string | null = null) {
  const file = path.join(l.dir, 'MERGE.md');
  if (!fs.existsSync(file)) return;
  const j = l.journal;
  let text = fs.readFileSync(file, 'utf8')
    .replace(/^- Phase: .*$/m, `- Phase: ${j.phase}`)
    .replace(/^- Outcome: .*$/m, `- Outcome: ${outcome}`)
    .replace(/^- Coverage: .*\n/m, '')
    .replace(/^## Failure\n\n[\s\S]*?\n\n(?=## )/m, '');
  if (coverage) text = text.replace(/^(- Outcome: .*)$/m, `$1\n- Coverage: ${coverage.replace(/^coverage: /, '')}`);
  if (j.failure) text = text.replace(/^## What needs you$/m, `## Failure\n\n${j.failure}\n\n## What needs you`);
  writeAtomic(file, text);
}

/** Drops the temporary copies and moves the session to `.meridian/history/<version>/<id>/`. */
function archive(root: string, l: Loaded): string {
  for (const d of ['base', 'ours', 'new', 'backup']) fs.rmSync(path.join(l.dir, d), { recursive: true, force: true });
  const folder = path.join(root, '.meridian', 'history', l.journal.targetVersion);
  fs.mkdirSync(folder, { recursive: true });
  let dest = path.join(folder, l.journal.id);
  for (let n = 1; fs.existsSync(dest); n++) dest = path.join(folder, `${l.journal.id}-${n}`);
  fs.renameSync(l.dir, dest);
  try { fs.rmdirSync(path.join(root, '.meridian', 'update')); } catch { /* other content stays */ }
  return path.relative(root, dest).split(path.sep).join('/');
}

/** The minimum of `x.y.z`, `^x.y.z`, `~x.y.z` or `>=x.y.z`, with the prefix it had. */
const parseSpec = (spec: string) => {
  const m = /^(\^|~|>=)?(\d+)\.(\d+)\.(\d+)(?:-[\w.]+)?$/.exec(spec.trim());
  return m ? { op: m[1] ?? '', v: [Number(m[2]), Number(m[3]), Number(m[4])] as [number, number, number] } : null;
};
const cmp = (a: number[], b: number[]) => a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!;

/** Whether `version` satisfies a standard specification. A specification this cannot read is not judged. */
function satisfies(spec: string, version: string): boolean {
  const want = parseSpec(spec);
  const have = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!want || !have) return true;
  const v: [number, number, number] = [Number(have[1]), Number(have[2]), Number(have[3])];
  const [M, m, p] = want.v;
  if (want.op === '') return cmp(v, want.v) === 0;
  if (cmp(v, want.v) < 0) return false;
  if (want.op === '>=') return true;
  if (want.op === '~') return cmp(v, [M, m + 1, 0]) < 0;
  return cmp(v, M > 0 ? [M + 1, 0, 0] : m > 0 ? [0, m + 1, 0] : [0, 0, p + 1]) < 0;
}

/** The entries the plan added or raised, and the framework, checked against what the install put in `node_modules`. */
function dependencyProblems(root: string, session: string, pm: string): string[] {
  const read = (file: string): Record<string, any> | null => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
  const staged = path.join(session, 'new', 'package.json');
  const saved = path.join(session, 'backup', 'package.json');
  const planned = read(fs.existsSync(staged) ? staged : path.join(root, 'package.json'));
  if (!planned) return [];
  const original = read(fs.existsSync(saved) ? saved : path.join(root, 'package.json'));
  const specs = (p: Record<string, any> | null): Record<string, string> => ({ ...p?.devDependencies, ...p?.dependencies });
  const want = specs(planned);
  const had = specs(original);
  const names = Object.keys(want).filter((n) => FRAMEWORK.includes(n) || had[n] !== want[n]).sort();
  const out: string[] = [];
  for (const name of names) {
    const spec = want[name]!;
    const installed = read(path.join(root, 'node_modules', ...name.split('/'), 'package.json'))?.version;
    if (typeof installed !== 'string') { out.push(`${name}: planned ${spec} but it is not installed; run ${pm} install`); continue; }
    const exact = FRAMEWORK.includes(name) && parseSpec(spec) !== null;
    const ok = exact ? installed === spec.replace(/^[\^~]|^>=/, '') : satisfies(spec, installed);
    if (!ok) out.push(`${name}: the install resolved ${installed}, which is not the planned ${spec}`);
  }
  return out;
}

const SMALL = (ms: number) => secs(ms);

/** Validates the session in place and, when every check passes on unchanged inputs, completes it. */
function finalizeLoaded(ctx: Context, l: Loaded, o: FinalizeOptions = { verify: false }): number {
  const { root, log } = ctx;
  const j = l.journal;
  const pm = packageManager(root);
  const finalizeCmd = pin(j.targetVersion, '--finalize');
  const stop = (why: string) => { log(`zz-meridian update: ${why}`); return 1; };

  const manifestFile = path.join(root, '.meridian', 'manifest.json');
  const targetText = serializeManifest(j.targetManifest);
  if (fs.existsSync(manifestFile) && sha(fs.readFileSync(manifestFile)) === sha(targetText)) {
    // An interrupted rename: the baseline is already the target's, so only the archival remains.
    j.phase = 'complete';
    j.failure = null;
    persistJournal(l);
    patchReport(l, 'complete');
    log(`note: the target manifest was already in place; archived the session to ${archive(root, l)}`);
    log('outcome: complete');
    return 0;
  }
  if (j.phase === 'prepared' || j.phase === 'applying') return stop(`the update was interrupted before every file was applied; run ${pin(j.targetVersion, '--resume')}`);
  if (j.phase === 'complete' || j.phase === 'aborted') return stop(`the session is ${j.phase}; it does not belong in .meridian/update/`);
  const installed = j.validation.find(isInstall);
  if (!installed) return stop(`the install has not run; run ${pin(j.targetVersion, '--resume')} to install, then ${finalizeCmd}`);
  if (installed.exitCode !== 0) return stop(`the install failed (see ${l.rel}/${installed.evidenceFile}); fix the cause, then run ${pin(j.targetVersion, '--resume')}`);

  // Readiness.
  let resolutions: ReturnType<typeof parseResolutions> = [];
  try { resolutions = parseResolutions(fs.readFileSync(path.join(l.dir, 'resolutions.json'), 'utf8')); } catch (e) {
    log(`pending: ${(e as Error).message}`);
    log(`outcome: needs-resolution`);
    log(`Next: fix ${l.rel}/resolutions.json, then ${finalizeCmd}`);
    return 2;
  }
  const open = unresolved(j, resolutions, (p) => probe(root, p).side.hash);
  if (open.length) {
    for (const line of open) log(`pending: ${line}`);
    log('outcome: needs-resolution');
    log(`Next: resolve the items in ${l.rel}/MERGE.md${open.some((x) => x.includes('never applied')) ? ` (or run ${pin(j.targetVersion, '--resume')})` : ''}, then ${finalizeCmd}`);
    return 2;
  }

  const fail = (why: string, changed: string[] = []) => {
    j.phase = 'failed';
    j.failure = changed.length ? `${why}\nChanged paths:\n${changed.map((p) => `- ${p}`).join('\n')}` : why;
    j.validation = j.validation.filter(isInstall);
    persistJournal(l);
    patchReport(l, 'failed');
    log(`zz-meridian update: ${why}`);
    for (const p of changed) log(`  ${p}`);
    log('outcome: failed');
    log(`Next: fix the cause, then ${finalizeCmd} again (or ${pin(j.targetVersion, '--abort')})`);
    return 1;
  };

  const dependencies = dependencyProblems(root, l.dir, pm);
  if (dependencies.length) return fail(`the installed dependencies do not match the plan:\n${dependencies.map((d) => `  ${d}`).join('\n')}`);

  // Validation, in place: the checks run on the live project and may touch only their permitted outputs.
  j.phase = 'validating';
  j.failure = null;
  j.validation = j.validation.filter(isInstall);
  persistJournal(l);
  const paths = j.operations.map((o) => o.path);
  let seen = takeInventory(root, paths);
  if (seen.conflicts.length) return fail('an output path cannot be exempted:', seen.conflicts);
  const steps: Array<{ name: string; args: string[]; shown: string }> = o.verify ? [
    { name: 'verify', args: ['scripts/verify.ts'], shown: 'node scripts/verify.ts' },
  ] : [
    { name: 'gate', args: ['scripts/gate.ts'], shown: 'node scripts/gate.ts' },
    { name: 'build', args: ['node_modules/next/dist/bin/next', 'build'], shown: 'node node_modules/next/dist/bin/next build' },
  ];
  const took: string[] = [];
  let coverage: string | null = null;
  let n = 1;
  for (const step of steps) {
    const t0 = performance.now();
    const r = ctx.run(process.execPath, step.args, root);
    took.push(`${step.name} ${SMALL(performance.now() - t0)}`);
    const evidence = `evidence/${n++}-${step.name}.log`;
    writeAtomic(path.join(l.dir, evidence), r.output);
    j.validation.push({ command: step.shown, exitCode: r.status, evidenceFile: evidence });
    const after = takeInventory(root, paths);
    if (after.conflicts.length) return fail(`an output path cannot be exempted after ${step.name}:`, after.conflicts);
    const changed = changedPaths(seen, after);
    if (changed.length) {
      return fail(`${step.name} changed protected inputs, so nothing was validated and the current bytes were kept. Review the change and commit it, then finalize again${r.status === 0 ? '' : ` (it also exited with ${r.status}; see ${l.rel}/${evidence})`}`, changed);
    }
    if (r.status !== 0) return fail(`${step.name} exited with ${r.status}; see ${l.rel}/${evidence}`);
    if (step.name === 'verify') coverage = r.output.split('\n').reverse().find((line) => line.startsWith('coverage: ')) ?? null;
    seen = after;
  }

  // The live candidate must still be what was validated before the baseline moves.
  const last = takeInventory(root, paths);
  const drift = changedPaths(seen, last);
  if (last.conflicts.length || drift.length) return fail('the project changed after it was validated; the current bytes were kept', [...last.conflicts, ...drift]);

  writeAtomic(manifestFile, targetText);
  j.phase = 'complete';
  persistJournal(l);
  patchReport(l, 'complete', coverage);
  const where = archive(root, l);
  log(`time: ${took.join(' · ')}`);
  if (o.verify) log(coverage ?? 'coverage: not reported by verify');
  else log(`browser: not run (run ${pm} run verify for the browser checks)`);
  log(`archived: ${where}`);
  log('outcome: complete');
  return 0;
}

/** Finalizes the session of this project: validates it and, when every check passes, makes the target the baseline. */
export function finalize(ctx: Context, o: FinalizeOptions): number {
  return command(ctx, false, (l) => finalizeLoaded(ctx, l, o));
}

/** Continues an interrupted update: applies what is unapplied without touching a later edit, then installs. */
export function resume(ctx: Context, o: ResumeOptions): number {
  return command(ctx, true, (l) => {
    const { root, log } = ctx;
    const j = l.journal;
    if (j.phase === 'complete' || j.phase === 'aborted') return (log(`zz-meridian update: the session is ${j.phase}; ${j.phase === 'complete' ? `run ${pin(j.targetVersion, '--finalize')} to finish archiving it` : 'nothing to resume'}`), 1);
    if (planHash(j) !== j.planHash) return (log('zz-meridian update: the plan was edited (its hash no longer matches state.json); nothing was applied'), 1);

    // Decide every unapplied operation before writing any, so one edited path stops the lot.
    const todo: FileOperation[] = [];
    const stopped: string[] = [];
    for (const op of j.operations) {
      if ((op.action !== 'write' && op.action !== 'delete') || op.applied) continue;
      const now = probe(root, op.path);
      if (now.unsafe) stopped.push(`${op.path}: a symbolic link or not a regular file is in the way`);
      else if (sameSide(now.side, op.ours)) {
        const staged = path.join(l.dir, 'new', op.path);
        if (op.action === 'write' && !(fs.existsSync(staged) && sha(fs.readFileSync(staged)) === op.target.hash)) stopped.push(`${op.path}: the staged new/ copy is missing or does not match the plan`);
        else todo.push(op);
      } else if (sameSide(now.side, op.target)) {
        op.applied = true;
        op.appliedHash = op.target.hash;
      } else stopped.push(`${op.path}: it is neither the recorded original nor the planned result, so it was edited since; nothing was written for it`);
    }
    if (stopped.length) {
      j.phase = 'failed';
      j.failure = `resume stopped; these paths changed since the plan was made:\n${stopped.map((s) => `- ${s}`).join('\n')}`;
      persistJournal(l);
      patchReport(l, 'failed');
      log('zz-meridian update: resume stopped; these paths changed since the plan was made, and nothing was written for them:');
      for (const s of stopped) log(`  ${s}`);
      log(`Next: reconcile them by hand, then ${pin(j.targetVersion, '--resume')} (or ${pin(j.targetVersion, '--abort')})`);
      return 1;
    }

    const t0 = performance.now();
    j.phase = 'applying';
    persistJournal(l);
    for (const op of todo) {
      const abs = inside(root, op.path);
      if (op.action === 'delete') {
        fs.unlinkSync(abs);
        op.appliedHash = null;
      } else {
        writeAtomic(abs, fs.readFileSync(path.join(l.dir, 'new', op.path)), op.ours.exists ? fs.statSync(abs).mode : undefined);
        op.appliedHash = op.target.hash;
      }
      op.applied = true;
      persistJournal(l);
    }
    const applyMs = performance.now() - t0;

    const pm = packageManager(root);
    const done = j.validation.find(isInstall);
    let installNote = done?.exitCode === 0 ? 'install already ran' : 'install skipped';
    if (o.install && done?.exitCode !== 0) {
      const r = install(ctx, l.dir, j, pm);
      installNote = `install ${secs(r.ms)}`;
      if (r.failure) {
        j.phase = 'failed';
        j.failure = r.failure;
        persistJournal(l);
        patchReport(l, 'failed');
        log(`zz-meridian update: ${r.failure}`);
        report(ctx, j, { verbose: o.verbose, keepWarnings: [] }, 'failed', `apply ${secs(applyMs)} · ${installNote}`, `fix the cause, then ${pin(j.targetVersion, '--resume')} (or ${pin(j.targetVersion, '--abort')})`);
        return 1;
      }
    }
    const installed = j.validation.find(isInstall)?.exitCode === 0;
    const pending = j.operations.some((x) => x.action === 'stage') || j.migrations.length > 0;
    j.phase = pending ? 'needs-resolution' : 'ready';
    j.failure = null;
    persistJournal(l);
    const outcome = pending ? 'migration-required' : installed ? 'ready-to-finalize' : 'install-pending';
    patchReport(l, outcome);
    const times = `apply ${secs(applyMs)} · ${installNote}`;
    if (!pending && installed) {
      report(ctx, j, { verbose: o.verbose, keepWarnings: [] }, outcome, times, null);
      return finalizeLoaded(ctx, l);
    }
    const next = pending
      ? `resolve the items in ${l.rel}/MERGE.md, then ${pin(j.targetVersion, '--finalize')} (or ${pin(j.targetVersion, '--abort')})`
      : `${pin(j.targetVersion, '--resume')} to install, then ${pin(j.targetVersion, '--finalize')} (or ${pin(j.targetVersion, '--abort')})`;
    report(ctx, j, { verbose: o.verbose, keepWarnings: [] }, outcome, times, next);
    return 2;
  });
}

/** Rolls the update back: only updater preimages and only when no later edit exists on any updater-touched path. */
export function abort(ctx: Context): number {
  return command(ctx, false, (l) => {
    const { root, log } = ctx;
    const j = l.journal;
    if (j.phase === 'complete' || j.phase === 'aborted') return (log(`zz-meridian update: the session is ${j.phase}; there is nothing to abort`), 1);
    const manifestFile = path.join(root, '.meridian', 'manifest.json');
    if (fs.existsSync(manifestFile) && sha(fs.readFileSync(manifestFile)) === sha(serializeManifest(j.targetManifest))) {
      log(`zz-meridian update: the target manifest is already in place, so the update is complete; run ${pin(j.targetVersion, '--finalize')} to archive it`);
      return 1;
    }

    const restore: FileOperation[] = [];
    const later: string[] = [];
    for (const op of j.operations) {
      if (op.action !== 'write' && op.action !== 'delete') continue;
      const now = probe(root, op.path);
      if (now.unsafe) later.push(op.path);
      else if (sameSide(now.side, op.ours)) continue;
      else if (sameSide(now.side, op.applied ? sideOf(op.appliedHash) : op.target)) restore.push(op);
      else later.push(op.path);
    }
    const unusable = restore.filter((op) => {
      if (!op.ours.exists) return false;
      const b = path.join(l.dir, 'backup', op.path);
      return !(fs.existsSync(b) && sha(fs.readFileSync(b)) === op.ours.hash);
    }).map((op) => op.path);
    if (later.length || unusable.length) {
      log('zz-meridian update: refusing to roll back; nothing was changed and every backup was kept.');
      for (const p of later) log(`  ${p}  edited after the update; backup: ${l.rel}/backup/${p}`);
      for (const p of unusable) log(`  ${p}  its backup is missing or altered, so it cannot be restored`);
      log(`Next: reconcile these paths by hand (the backups are in ${l.rel}/backup/), then ${pin(j.targetVersion, '--abort')} again`);
      return 1;
    }

    const restored = new Set<string>();
    for (const op of restore) {
      const abs = inside(root, op.path);
      if (op.ours.exists) {
        writeAtomic(abs, fs.readFileSync(path.join(l.dir, 'backup', op.path)), fs.existsSync(abs) ? fs.statSync(abs).mode : undefined);
      } else {
        fs.rmSync(abs, { force: true });
        for (let d = path.dirname(abs); d !== root && d.startsWith(root + path.sep); d = path.dirname(d)) {
          try { fs.rmdirSync(d); } catch { break; }
        }
      }
      restored.add(op.path);
    }
    j.phase = 'aborted';
    persistJournal(l);
    patchReport(l, 'aborted');
    const where = archive(root, l);
    const pm = packageManager(root);
    log(`restored ${restore.length} ${restore.length === 1 ? 'path' : 'paths'}; the original manifest was never changed`);
    if ([...restored].some((p) => Object.values(LOCKFILES).includes(p as never) || p === 'bun.lockb')) log(`The lockfile was restored; node_modules was not. Run ${pm} install.`);
    log(`archived: ${where}`);
    log('outcome: aborted');
    return 0;
  });
}
