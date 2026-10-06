/**
 * Exact replay of one published version: fetch it through the user's npm, check its integrity, extract it without
 * letting an entry escape, and run that version's own `adopt` or `create` in a scratch folder. Nothing in the project
 * is read or written; the result is the hash of every file the replay produced.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brandArgs, inside, projectPath, run, sha256, type Manifest } from './files.js';
import type { Release } from './session.js';

/** The package folder of the running CLI: the parent of its `dist/`. */
export const runningRelease = () => path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** A command's failure as one message: the cause, then everything it printed. */
function failure(what: string, r: ReturnType<typeof run>): string | undefined {
  if (r.error) return `${what} could not run: ${r.error.message}`;
  if (r.status !== 0) return `${what} exited with ${r.status}: ${`${r.stdout ?? ''}${r.stderr ?? ''}`.trim()}`;
  return undefined;
}

/** Refuses a tar listing with an absolute, `..`, backslash or non-`package/` entry; returns nothing otherwise. */
export function assertSafeEntries(entries: string[]) {
  for (const e of entries) {
    const bad = (why: string) => new Error(`refusing the package: entry ${JSON.stringify(e)} ${why}`);
    if (!e || e.includes('\0') || e.includes('\\')) throw bad('is not a plain path');
    if (e.startsWith('/') || /^[A-Za-z]:/.test(e)) throw bad('is absolute');
    const parts = e.split('/').filter((p, i, a) => p !== '' || i === a.length - 1);
    if (parts.some((p) => p === '..' || p === '.' || p === '')) throw bad('contains a ".." or empty segment');
    if (parts[0] !== 'package') throw bad('is not under package/');
  }
}

/** Refuses anything under `dir` that is not a regular file or a directory, and a regular file with more than one link. */
function assertPlainTree(dir: string) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = fs.lstatSync(abs);
    if (st.isDirectory()) assertPlainTree(abs);
    else if (!st.isFile()) throw new Error(`refusing the package: ${abs} is not a regular file or a directory`);
    else if (st.nlink > 1) throw new Error(`refusing the package: ${abs} is hard-linked`);
  }
}

/** Packs one exact version through npm, verifies its sha512 against npm's own record, and extracts it into `scratch/pkg`. */
export function fetchRelease(version: string, scratch: string): { pkgRoot: string; integrity: string } {
  assertVersion(version);
  const spec = `zz-meridian@${version}`;
  const pack = run('npm', ['pack', spec, '--json', '--pack-destination', scratch, '--ignore-scripts'], scratch, true);
  const packFailed = failure(`npm pack ${spec}`, pack);
  if (packFailed) throw new Error(packFailed);
  let filename: string, packed: string;
  try {
    const [info] = JSON.parse(pack.stdout);
    filename = info.filename;
    packed = info.integrity;
  } catch {
    throw new Error(`npm pack ${spec} printed no usable JSON: ${pack.stdout.trim()}`);
  }
  if (!filename || path.basename(filename) !== filename) throw new Error(`npm pack ${spec} named an unusable file: ${JSON.stringify(filename)}`);
  const view = run('npm', ['view', spec, 'dist.integrity'], scratch, true);
  const viewFailed = failure(`npm view ${spec}`, view);
  if (viewFailed) throw new Error(viewFailed);
  const expected = view.stdout.trim();

  const tarball = path.join(scratch, filename);
  const actual = `sha512-${createHash('sha512').update(fs.readFileSync(tarball)).digest('base64')}`;
  if (actual !== expected || actual !== packed) {
    throw new Error(`integrity mismatch for ${spec}: file ${actual}, npm pack ${packed}, registry ${expected}`);
  }

  return { pkgRoot: extractTarball(tarball, scratch), integrity: actual };
}

/** The version of a release a person asks for by number: x.y.z only, so nothing in it can be read as a path or an option. */
const assertVersion = (version: string) => {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`version ${JSON.stringify(version)} must look like 1.2.3`);
};

/** A packed release from a local folder (`zz-meridian-<version>.tgz`), extracted as safely as a fetched one. For tests only. */
export function localRelease(dir: string, version: string, scratch: string): { pkgRoot: string } {
  assertVersion(version);
  const tarball = path.join(dir, `zz-meridian-${version}.tgz`);
  if (!fs.existsSync(tarball)) throw new Error(`ZZ_MERIDIAN_LOCAL_RELEASES has no ${path.basename(tarball)}`);
  return { pkgRoot: extractTarball(tarball, scratch) };
}

/** Lists a tarball, refuses an unsafe entry, extracts it into `scratch/pkg` and refuses anything but plain files. */
function extractTarball(tarball: string, scratch: string): string {
  const list = run('tar', ['-tzf', tarball], scratch, true);
  const listFailed = failure('tar -tzf', list);
  if (listFailed) throw new Error(listFailed);
  assertSafeEntries(list.stdout.split('\n').filter(Boolean));
  const pkg = path.join(scratch, 'pkg');
  fs.mkdirSync(pkg);
  const extract = run('tar', ['-xzf', tarball, '-C', pkg], scratch, true);
  const extractFailed = failure('tar -xzf', extract);
  if (extractFailed) throw new Error(extractFailed);
  assertPlainTree(pkg);
  return path.join(pkg, 'package');
}

/** The smallest Next.js App Router project `adopt` accepts. */
const synthetic = (moduleType: boolean): Record<string, string> => ({
  'package.json': `{"name":"replay","private":true${moduleType ? ',"type":"module"' : ''},"dependencies":{"next":"16.3.8","react":"19.3.0","react-dom":"19.3.0"}}`,
  'tsconfig.json': '{"compilerOptions":{"target":"ES2022","jsx":"preserve","paths":{"@/*":["./*"]}}}',
  'app/layout.tsx': "import './globals.css';\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <body>{children}</body>\n    </html>\n  );\n}\n",
  'app/page.tsx': 'export default function Page() {\n  return <main>Replay</main>;\n}\n',
  'app/globals.css': '',
});

const SKIPPED = new Set(['node_modules', '.git', '.next']);

/** Every regular file under `root` outside node_modules, .git and .next, as project-relative posix path to sha256. */
function hashTree(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (SKIPPED.has(e.name)) continue;
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.set(p, sha256(fs.readFileSync(inside(root, p))));
    }
  };
  walk('');
  return out;
}

/**
 * Runs the package's own `adopt` (in a synthetic project) or `create` (into a new folder) under `scratch`. Returns the
 * project folder and the hash of every file it holds. A synthetic project with `"type": "module"` makes adopt skip
 * `scripts/package.json`, the way a project of that shape would have.
 */
function replayTree(pkgRoot: string, route: 'adopt' | 'create', brand: Record<string, string>, scratch: string, moduleType: boolean): { project: string; hashes: Map<string, string> } {
  const cli = path.join(pkgRoot, 'dist', 'cli.js');
  let project: string;
  let args: string[];
  if (route === 'adopt') {
    project = fs.mkdtempSync(path.join(scratch, 'adopt-'));
    for (const [rel, content] of Object.entries(synthetic(moduleType))) {
      const abs = inside(project, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
    }
    args = [cli, 'adopt', '--allow-dirty', '--no-install', ...brandArgs(brand)];
  } else {
    // create refuses a folder that exists, so it gets a name that does not, inside a folder of its own.
    project = path.join(fs.mkdtempSync(path.join(scratch, 'create-')), 'project');
    args = [cli, 'create', project, '--no-install', ...brandArgs(brand)];
  }
  const r = run(process.execPath, args, route === 'adopt' ? project : scratch, true);
  const failed = failure(`replayed ${route}`, r);
  if (failed) throw new Error(failed);
  return { project, hashes: hashTree(project) };
}

/** The hash of every file one replay produced, for a project with no `"type"` (the shape 0.3.0's adopt always saw). */
export function replay(pkgRoot: string, route: 'adopt' | 'create', brand: Record<string, string>, scratch: string, moduleType = false): Map<string, string> {
  return replayTree(pkgRoot, route, brand, scratch, moduleType).hashes;
}

/** Every regular file under `<release>/payload` as posix project paths, symbolic links never followed. */
export function payloadList(release: string): string[] {
  const base = path.join(release, 'payload');
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(base, rel), { withFileTypes: true })) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(projectPath(p));
    }
  };
  if (fs.existsSync(base)) walk('');
  return out.sort();
}

const readIf = (file: string) => (fs.lstatSync(file, { throwIfNoEntry: false })?.isFile() ? fs.readFileSync(file, 'utf8') : null);

/**
 * One release replayed with the manifest's brand and project shape: the replayed project, its hashes, and what the
 * update needs from the package (its file list, template package.json and changelog). The project had `scripts/package.json`
 * generated exactly when the recorded manifest holds it, so the replay reproduces that.
 */
export function replayRelease(pkgRoot: string, manifest: Manifest, scratch: string): Release {
  const moduleType = manifest.route === 'adopt' && !('scripts/package.json' in manifest.files);
  const { project, hashes } = replayTree(pkgRoot, manifest.route, manifest.brand, scratch, moduleType);
  const template = JSON.parse(readIf(path.join(pkgRoot, 'payload', 'package.json')) ?? '{}');
  return {
    version: JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8')).version,
    payload: payloadList(pkgRoot),
    tree: project,
    hashes,
    agents: readIf(path.join(project, 'AGENTS.md')),
    changelog: readIf(path.join(pkgRoot, 'payload', 'CHANGELOG.md')) ?? '',
    pkg: { dependencies: template.dependencies, devDependencies: template.devDependencies, scripts: template.scripts },
  };
}
