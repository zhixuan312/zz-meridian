/**
 * `brand`: change a project's brand without hand edits. The new brand is reconstructed from the running release (never
 * from the working copy), the files it changes are checked against the old reconstruction, and the brand outputs, the
 * app configuration and the manifest move together or not at all.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BRAND_FLAGS, VERSION, brandArgs, effectiveBrand, inside, run, sha256, type Manifest } from './files.js';
import { managedPaths, parseManifest } from './ownership.js';
import { replayRelease, runningRelease } from './replay.js';
import { writeAtomic } from './session.js';

export type RebrandContext = {
  root: string;
  /** The running version; must equal the manifest's. */
  version: string;
  replay: (brand: Record<string, string>) => { tree: string; hashes: Map<string, string>; payload: string[] };
  /** The app configuration after the change; throws when it is unsupported. */
  brandConfig: (appConfig: string, change: Record<string, string>) => string;
  log: (line: string) => void;
};

const ACCENT = ['accent', 'hex', 'hue', 'chroma'];
const APP_CONFIG = 'src/app.config.ts';
const SESSION = '.meridian/update';
const LOCK = '.meridian/update.lock';
const MANIFEST = '.meridian/manifest.json';

/** The recorded brand with `change` applied: a change that names any accent value replaces the whole accent choice. */
export function mergeBrand(recorded: Record<string, string>, change: Record<string, string>): Record<string, string> {
  const replaces = ACCENT.some((k) => change[k]);
  const kept = Object.fromEntries(Object.entries(recorded).filter(([k]) => !(replaces && ACCENT.includes(k))));
  return effectiveBrand({ ...kept, ...change });
}

/** A cause the rebrand refuses for, before it writes anything. */
class Refusal extends Error {}

const same = (a: Record<string, string>, b: Record<string, string>) => BRAND_FLAGS.every((k) => (a[k] ?? '') === (b[k] ?? ''));

/** The file's bytes, null when absent; a symbolic link or a non-file on the way is a refusal. */
function read(root: string, rel: string): Buffer | null {
  const abs = inside(root, rel);
  const st = fs.lstatSync(abs, { throwIfNoEntry: false });
  if (!st) return null;
  if (!st.isFile()) throw new Refusal(`${rel} is not a regular file`);
  return fs.readFileSync(abs);
}

const hashOf = (b: Buffer | null) => (b ? sha256(b) : null);

/** Rebrands the project at `ctx.root`; 0 when rebranded or nothing to change, 1 when refused. Nothing changes on a refusal. */
export function rebrand(ctx: RebrandContext, change: Record<string, string>, { allowDirty }: { allowDirty: boolean }): number {
  try {
    return attempt(ctx, change, allowDirty);
  } catch (e) {
    if (!(e instanceof Refusal)) throw e;
    ctx.log(`zz-meridian brand: ${e.message}`);
    return 1;
  }
}

function attempt(ctx: RebrandContext, change: Record<string, string>, allowDirty: boolean): number {
  const { root, log } = ctx;
  const listed = (paths: string[]) => paths.map((p) => `\n  ${p}`).join('');

  const manifestText = read(root, MANIFEST);
  if (!manifestText) throw new Refusal(`${MANIFEST} is missing; this project was not set up by zz-meridian`);
  let manifest: Manifest;
  try { manifest = parseManifest(manifestText.toString('utf8')); } catch (e) { throw new Refusal(`${MANIFEST} is unusable: ${(e as Error).message}`); }

  if (fs.existsSync(path.join(root, SESSION)) || fs.existsSync(path.join(root, LOCK))) {
    throw new Refusal(`an update is in progress (${fs.existsSync(path.join(root, SESSION)) ? SESSION : LOCK}). Finish it with its --finalize or --abort first. Nothing was changed.`);
  }
  if (manifest.version !== ctx.version) {
    throw new Refusal(`this project was set up by zz-meridian ${manifest.version} and this is ${ctx.version}. Run npx zz-meridian@${ctx.version} update first. Nothing was changed.`);
  }
  if (!allowDirty) {
    const git = run('git', ['status', '--porcelain'], root, true);
    if (git.status !== 0) throw new Refusal('this folder is not a git repository, so the change could not be reviewed or undone as one diff. Commit it to git first, or pass --allow-dirty.');
    if (git.stdout.trim()) throw new Refusal('the git tree has uncommitted changes. Commit or stash them first, so the rebrand is one reviewable diff (or pass --allow-dirty).');
  }

  const merged = mergeBrand(manifest.brand, change);
  if (same(merged, effectiveBrand(manifest.brand))) { log('brand: nothing to change'); return 0; }

  // The old baseline must be reproduced exactly, or the recorded hashes say nothing about what the release wrote.
  const old = ctx.replay(manifest.brand);
  const oldManaged = managedPaths(old.payload, manifest.route, [...old.hashes.keys()]);
  const drift = Object.entries(manifest.files).filter(([p, h]) => oldManaged.has(p) && old.hashes.get(p) !== h).map(([p]) => p).sort();
  if (drift.length) throw new Refusal(`the release does not reproduce the recorded baseline for the current brand, so the recorded hashes cannot be trusted:${listed(drift)}\nNothing was changed.`);

  const next = ctx.replay(merged);
  const managed = managedPaths(next.payload, manifest.route, [...old.hashes.keys(), ...next.hashes.keys()]);
  const affected = [...managed].filter((p) => (old.hashes.get(p) ?? null) !== (next.hashes.get(p) ?? null)).sort();

  // Each affected file must still be exactly what the release wrote for the old brand.
  const before = new Map<string, Buffer | null>(affected.map((p) => [p, read(root, p)]));
  const edited = affected.filter((p) => hashOf(before.get(p)!) !== (old.hashes.get(p) ?? null));
  if (edited.length) throw new Refusal(`these brand outputs differ from what the release generated, so a rebrand would overwrite your work:${listed(edited)}\nRevert them (or move the change somewhere else), then run brand again. Nothing was changed.`);

  const configBefore = read(root, APP_CONFIG);
  if (!configBefore) throw new Refusal(`${APP_CONFIG} is missing; branding changes it, so the rebrand cannot run`);
  let configAfter: string;
  try { configAfter = ctx.brandConfig(configBefore.toString('utf8'), change); } catch (e) { throw new Refusal(`${APP_CONFIG} cannot be rebranded: ${(e as Error).message}. Nothing was changed.`); }

  // The new bytes, checked against the replay's hashes before anything is written.
  const bytes = new Map<string, Buffer | null>();
  for (const p of affected) {
    const want = next.hashes.get(p);
    if (want === undefined) { bytes.set(p, null); continue; }
    const b = fs.readFileSync(inside(next.tree, p));
    if (sha256(b) !== want) throw new Refusal(`the replay's ${p} does not match its own hash`);
    bytes.set(p, b);
  }

  const files = { ...manifest.files };
  for (const p of affected) { const h = next.hashes.get(p); if (h === undefined) delete files[p]; else files[p] = h; }
  const manifestAfter = JSON.stringify({ ...manifest, brand: merged, files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) }, null, 2) + '\n';

  // Write everything, the manifest last; any failure puts every preimage back.
  const touched: { rel: string; was: Buffer | null; mode?: number }[] = [];
  const modeOf = (rel: string) => fs.lstatSync(inside(root, rel), { throwIfNoEntry: false })?.mode;
  const put = (rel: string, data: Buffer | string | null) => {
    const abs = inside(root, rel);
    touched.push({ rel, was: read(root, rel), mode: modeOf(rel) });
    if (data === null) fs.rmSync(abs, { force: true });
    else writeAtomic(abs, data, modeOf(rel));
  };
  try {
    for (const p of affected) put(p, bytes.get(p)!);
    if (configAfter !== configBefore.toString('utf8')) put(APP_CONFIG, configAfter);
    put(MANIFEST, manifestAfter);
  } catch (e) {
    for (const t of touched.reverse()) {
      try {
        if (t.was === null) fs.rmSync(inside(root, t.rel), { force: true });
        else writeAtomic(inside(root, t.rel), t.was, t.mode);
      } catch { /* keep restoring the rest */ }
    }
    throw new Refusal(`a write failed (${(e as Error).message}); every file was put back. Nothing was changed.`);
  }

  log(`brand: ${Object.entries(merged).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  for (const p of affected) log(`  ${bytes.get(p) === null ? 'removed' : before.get(p) === null ? 'added' : 'updated'} ${p}`);
  if (configAfter !== configBefore.toString('utf8')) log(`  updated ${APP_CONFIG}`);
  log(`  updated ${MANIFEST}`);
  return 0;
}

/** The command: the real context, which replays the running release and runs its branding script in scratch. */
export function brandCommand({ root, flags, allowDirty }: { root: string; flags: Record<string, string>; allowDirty: boolean }): number {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-meridian-brand-'));
  const log = (line: string) => (line.startsWith('zz-meridian brand:') ? console.error(line) : console.log(line));
  const replays = new Map<string, ReturnType<RebrandContext['replay']>>();
  let n = 0;
  try {
    let manifest: Manifest | undefined;
    try { manifest = parseManifest(fs.readFileSync(inside(root, MANIFEST), 'utf8')); } catch { /* rebrand names the cause */ }
    const pkg = runningRelease();
    const ctx: RebrandContext = {
      root,
      version: VERSION,
      log,
      replay: (brand) => {
        const m = manifest ?? { version: VERSION, route: 'adopt' as const, brand, files: {} };
        const dir = path.join(scratch, `r${n++}`);
        fs.mkdirSync(dir);
        const r = replayRelease(pkg, { ...m, brand }, dir);
        const out = { tree: r.tree, hashes: r.hashes, payload: r.payload };
        replays.set(JSON.stringify(brand), out);
        return out;
      },
      brandConfig: (text, change) => {
        const old = replays.get(JSON.stringify(manifest?.brand));
        if (!old) throw new Error('the old replay is missing');
        const copy = path.join(scratch, `brand-${n++}`);
        fs.cpSync(old.tree, copy, { recursive: true });
        fs.writeFileSync(path.join(copy, APP_CONFIG), text);
        const r = run(process.execPath, ['scripts/brand.ts', '--existing', ...brandArgs(change)], copy, true);
        if (r.error) throw new Error(`the branding script could not run: ${r.error.message}`);
        if (r.status !== 0) throw new Error(`the branding script failed: ${`${r.stderr ?? ''}${r.stdout ?? ''}`.trim().split('\n').filter(Boolean).pop() ?? `exit ${r.status}`}`);
        return fs.readFileSync(path.join(copy, APP_CONFIG), 'utf8');
      },
    };
    return rebrand(ctx, effectiveBrand(flags), { allowDirty });
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
