/**
 * Exact replay of one published version: fetch it through the user's npm, check its integrity, extract it without
 * letting an entry escape, and run that version's own `adopt` or `create` in a scratch folder. Nothing in the project
 * is read or written; the result is the hash of every file the replay produced.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brandArgs, inside, run, sha256 } from './files.js';

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
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`version ${JSON.stringify(version)} must look like 1.2.3`);
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
  return { pkgRoot: path.join(pkg, 'package'), integrity: actual };
}

/** The smallest Next.js App Router project `adopt` accepts. */
const SYNTHETIC: Record<string, string> = {
  'package.json': '{"name":"replay","private":true,"dependencies":{"next":"16.3.8","react":"19.3.0","react-dom":"19.3.0"}}',
  'tsconfig.json': '{"compilerOptions":{"target":"ES2022","jsx":"preserve","paths":{"@/*":["./*"]}}}',
  'app/layout.tsx': "import './globals.css';\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <body>{children}</body>\n    </html>\n  );\n}\n",
  'app/page.tsx': 'export default function Page() {\n  return <main>Replay</main>;\n}\n',
  'app/globals.css': '',
};

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

/** Runs the package's own `adopt` (in a synthetic project) or `create` (into a new folder) under `scratch`, and hashes what it wrote. */
export function replay(pkgRoot: string, route: 'adopt' | 'create', brand: Record<string, string>, scratch: string): Map<string, string> {
  const cli = path.join(pkgRoot, 'dist', 'cli.js');
  let project: string;
  let args: string[];
  if (route === 'adopt') {
    project = fs.mkdtempSync(path.join(scratch, 'adopt-'));
    for (const [rel, content] of Object.entries(SYNTHETIC)) {
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
  return hashTree(project);
}
