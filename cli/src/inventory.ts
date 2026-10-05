/**
 * The typed inventory finalize validates against: every path the checks must leave alone (protected inputs), and the
 * few outputs a gate and a build are expected to write (permitted outputs). A fingerprint is existence plus a SHA-256
 * and lives in memory only; the inventory is never written anywhere, and only the names of changed paths are reported.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readJsonc, run, sha256 } from './files.js';

/** Folders that are never walked: the repository, dependency contents, and the updater's own state. */
const SKIPPED_DIRS = new Set(['.git', 'node_modules']);
const UPDATER = ['.meridian/update', '.meridian/history', '.meridian/update.lock'];

export type Inventory = { prints: Map<string, string>; conflicts: string[] };

const NEXT_CONFIGS = ['next.config.ts', 'next.config.mts', 'next.config.js', 'next.config.mjs', 'next.config.cjs'];
const overlaps = (a: string, b: string) => a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);

/** The Next build folder: `distDir` when `next.config` sets it as a string literal, else `.next`. */
function distDir(root: string): string {
  for (const name of NEXT_CONFIGS) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    const m = /\bdistDir\s*:\s*(['"`])([^'"`$]+)\1/.exec(fs.readFileSync(file, 'utf8'));
    if (m) return m[2]!;
  }
  return '.next';
}

/** The build-info file TypeScript writes: the configured one, or `tsconfig.tsbuildinfo` when the build is incremental. */
function buildInfo(root: string): string | null {
  let options: Record<string, unknown>;
  try { options = readJsonc(path.join(root, 'tsconfig.json')).compilerOptions ?? {}; } catch { return null; }
  if (typeof options.tsBuildInfoFile === 'string') return options.tsBuildInfoFile;
  if (options.incremental !== true && options.composite !== true) return null;
  return `${typeof options.outDir === 'string' ? `${options.outDir.replace(/\/+$/, '')}/` : ''}tsconfig.tsbuildinfo`;
}

type Output = { rel: string; directory: boolean };

/** The permitted outputs, as project-relative posix paths. A path that leaves the project is reported as a conflict. */
function outputsOf(root: string): { outputs: Output[]; conflicts: string[] } {
  const outputs: Output[] = [];
  const conflicts: string[] = [];
  const add = (spec: string, directory: boolean) => {
    const abs = path.resolve(root, spec);
    const rel = path.relative(root, abs).split(path.sep).join('/');
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) conflicts.push(`${spec}: an output path outside the project is not exempt`);
    else outputs.push({ rel, directory });
  };
  add(distDir(root), true);
  add('out', true);
  add('coverage', true);
  const info = buildInfo(root);
  if (info) add(info, false);
  const env = path.join(root, 'next-env.d.ts');
  const canonical = !fs.existsSync(env) || fs.readFileSync(env, 'utf8').includes('reference types="next');
  if (canonical) add('next-env.d.ts', false);
  return { outputs, conflicts };
}

/** True when git tracks a file inside `dir`: an output folder that holds the team's own files is not an output. */
function tracksFiles(root: string, dir: string): boolean {
  if (!fs.existsSync(path.join(root, '.git'))) return false;
  const r = run('git', ['ls-files', '--', dir], root, true);
  return r.status === 0 && (r.stdout ?? '').trim() !== '';
}

/** A symbolic link on the way to `rel` (or at `rel` itself), as the first such project-relative path. */
function linkOn(root: string, rel: string): string | null {
  let cur = root;
  for (const seg of rel.split('/')) {
    cur = path.join(cur, seg);
    if (fs.lstatSync(cur, { throwIfNoEntry: false })?.isSymbolicLink()) return path.relative(root, cur).split(path.sep).join('/');
  }
  return null;
}

/**
 * Fingerprints every protected input under `root`. `managed` are the project paths Meridian manages or the team keeps:
 * an output that overlaps one of them is a conflict, as is an output behind a symbolic link or holding tracked files.
 */
export function takeInventory(root: string, managed: readonly string[]): Inventory {
  const { outputs, conflicts } = outputsOf(root);
  for (const o of outputs) {
    const clash = managed.find((p) => overlaps(p, o.rel));
    if (clash) conflicts.push(`${o.rel}: an output path that overlaps ${clash}, a managed or kept file, is not exempt`);
    const link = linkOn(root, o.rel);
    if (link) conflicts.push(`${link}: an output path that is a symbolic link is not exempt`);
    else if (o.directory && tracksFiles(root, o.rel)) conflicts.push(`${o.rel}: an output folder that holds tracked files is not exempt`);
  }
  const exempt = new Set([...UPDATER, ...outputs.map((o) => o.rel)]);
  const prints = new Map<string, string>();
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (exempt.has(p)) continue;
      const abs = path.join(root, p);
      if (e.isDirectory()) { if (!SKIPPED_DIRS.has(e.name)) walk(p); }
      else if (e.isSymbolicLink()) prints.set(p, `link ${fs.readlinkSync(abs)}`);
      else if (e.isFile()) prints.set(p, sha256(fs.readFileSync(abs)));
      else prints.set(p, 'special');
    }
  };
  walk('');
  return { prints, conflicts };
}

/** The paths that exist in only one inventory or differ between them, sorted. */
export function changedPaths(before: Inventory, after: Inventory): string[] {
  const out: string[] = [];
  for (const [p, h] of after.prints) if (before.prints.get(p) !== h) out.push(p);
  for (const p of before.prints.keys()) if (!after.prints.has(p)) out.push(p);
  return [...new Set(out)].sort();
}
