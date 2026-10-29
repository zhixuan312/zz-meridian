/**
 * The file work every command shares: where the payload is, reading and writing inside one project without ever
 * leaving it, hashing for the manifest, and running a tool without a shell.
 */
import { createHash } from 'node:crypto';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The template snapshot this package carries, extracted from the release commit by `git archive` (cli/scripts/build-payload.ts). */
export const PAYLOAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'payload');

export const VERSION: string = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8')).version;

/**
 * npm renames a `.gitignore` inside an installed package to `.npmignore`, so the payload carries the template's as
 * `gitignore`. `shippedPath` is the name a project path ships under; `projectPath` reads one back, and also reads a
 * `.gitignore` as itself, which is how releases before 0.6.1 carry it.
 */
export const shippedPath = (rel: string) => (rel === '.gitignore' ? 'gitignore' : rel);
export const projectPath = (rel: string) => (rel === 'gitignore' ? '.gitignore' : rel);

/**
 * The message a checkout gets when it asks for the payload and nobody has built it. `cli/payload/` is a build output, so
 * a fresh clone has none, and without this the failure was a bare `ENOENT` on whichever file the reader wanted first, or
 * — worse — an empty list, which a test read as "the template has no skill files".
 */
const NOT_BUILT = 'cli/payload/ has not been built: run `node cli/scripts/build-payload.ts` (or `--worktree` to build what the working tree holds) and run this again.';

/** A payload file's bytes, by its project path. */
export function payloadBytes(rel: string): Buffer {
  if (!fs.existsSync(PAYLOAD)) throw new Error(NOT_BUILT);
  const abs = path.join(PAYLOAD, shippedPath(rel));
  if (!fs.existsSync(abs)) throw new Error(`${rel} is not in cli/payload/, which was built before that file was added or left it out: run \`node cli/scripts/build-payload.ts\` again.`);
  return fs.readFileSync(abs);
}

/** Every file under a payload folder, as project paths. Symbolic links are never followed. */
export function payloadFiles(dir = ''): string[] {
  if (!fs.existsSync(PAYLOAD)) throw new Error(NOT_BUILT);
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(PAYLOAD, rel), { withFileTypes: true })) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(projectPath(p));
    }
  };
  if (fs.existsSync(path.join(PAYLOAD, dir))) walk(dir);
  return out.sort();
}

export const readPayload = (rel: string) => payloadBytes(rel).toString('utf8');

/**
 * A path inside `root`; anything that would resolve outside it is refused: `..`, an absolute path, or a symbolic link
 * on the way (a linked folder or file could carry a write somewhere else).
 */
export function inside(root: string, rel: string): string {
  const abs = path.resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error(`refusing to touch ${rel}: it is outside ${root}`);
  for (let p = abs; p !== root && p.startsWith(root + path.sep); p = path.dirname(p)) {
    if (fs.lstatSync(p, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error(`refusing to touch ${rel}: ${path.relative(root, p)} is a symbolic link`);
  }
  return abs;
}

export function writeIn(root: string, rel: string, content: string | Buffer) {
  const abs = inside(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

export const sha256 = (content: string | Buffer) => `sha256-${createHash('sha256').update(content).digest('hex')}`;

/** What a quiet command may print and still be read whole: past Node's 1 MiB default the child is killed, and a long gate reads as exit 1. */
const OUTPUT = 256 * 1024 * 1024;

/**
 * A command with its arguments, without a shell, so nothing in a name or a path is ever interpreted. The one exception
 * is a Windows .cmd shim (npm, pnpm, tsc), which Node runs only through a shell: those calls pass fixed arguments
 * only, never a brand flag or a path the person typed; node itself (the brand script) never goes through a shell.
 */
export function run(cmd: string, args: string[], cwd: string, quiet = false): SpawnSyncReturns<string> {
  const shim = process.platform === 'win32' && cmd !== process.execPath;
  return spawnSync(shim && cmd.includes(' ') ? `"${cmd}"` : cmd, args, { cwd, encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit', shell: shim, maxBuffer: OUTPUT });
}

/** The package manager a project already uses, from its lockfile; npm when it has none. */
export function packageManager(root: string): 'pnpm' | 'yarn' | 'bun' | 'npm' {
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(root, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(root, 'bun.lock')) || fs.existsSync(path.join(root, 'bun.lockb'))) return 'bun';
  return 'npm';
}

/**
 * The install that follows Meridian's own edit to package.json. pnpm freezes the lockfile where `CI` is set and refuses
 * the edit it was run to take in, so it is asked to write the lockfile; the other managers write it as they are.
 */
export const installArgs = (pm: ReturnType<typeof packageManager>): string[] => (pm === 'pnpm' ? ['install', '--no-frozen-lockfile'] : ['install']);

/** A tool in the project's node_modules, run as `node <its script>`: no shell and no .cmd shim on any platform. */
export function runTool(root: string, entry: string, args: string[], quiet = true): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [path.join(root, 'node_modules', entry), ...args], { cwd: root, encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit', maxBuffer: OUTPUT });
}

export const hasCommand = (cmd: string) => spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' }).status === 0;

/** A JSONC document's text with the comments dropped, and whether anything had to be dropped to read it. */
function strippedJsonc(text: string): { json: string; dropped: boolean } {
  let out = '';
  let dropped = false;
  for (let i = 0, str = false; i < text.length; i++) {
    const c = text[i];
    if (str) { out += c; if (c === '\\') out += text[++i]; else if (c === '"') str = false; continue; }
    if (c === '"') { str = true; out += c; continue; }
    if (c === '/' && text[i + 1] === '/') { dropped = true; while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && text[i + 1] === '*') { dropped = true; i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; continue; }
    out += c;
  }
  const json = out.replace(/,(\s*[}\]])/g, '$1');
  return { json, dropped: dropped || json.length !== out.length };
}

/** JSON with the comments and trailing commas a tsconfig may carry. */
export function readJsonc(file: string): any {
  return JSON.parse(strippedJsonc(fs.readFileSync(file, 'utf8')).json);
}

/**
 * Whether a project's file carries what plain JSON cannot hold: a comment, or a trailing comma. `next dev` writes a
 * tsconfig through `comment-json`, which keeps both, so a tool that re-serialises one drops what the team's own
 * toolchain preserves — and this is the question to ask before doing it.
 */
export const jsoncExtras = (text: string) => strippedJsonc(text).dropped;

/**
 * Meridian's own `@/` imports, made relative to the file. An adopting project may map `@/` somewhere else, or already
 * have a `components/ui/button`; a relative import can never resolve to the team's file instead of Meridian's.
 */
export function relativeImports(rel: string, source: string): string {
  // A literal specifier only: a template string such as `import('@/${dir}')` is code that builds a path, not an import.
  return source.replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])@\/([\w./()[\]-]+)\2/g, (_m, lead: string, q: string, spec: string) => {
    let to = path.posix.relative(path.posix.dirname(rel), `src/${spec}`);
    if (!to.startsWith('.')) to = `./${to}`;
    return `${lead}${q}${to}${q}`;
  });
}

/** The manifest a later `update` reads: what was copied, at which version, with which brand. */
export type Manifest = {
  version: string;
  route: 'adopt' | 'create';
  brand: Record<string, string>;
  files: Record<string, string>;
};

/**
 * The manifest file as every writer writes it: paths sorted by code unit (never the machine's collation), two-space
 * indent, a final newline. Finalize tells an interrupted rename by comparing the file with this, byte for byte.
 */
export function manifestText(m: Manifest): string {
  const files = Object.fromEntries(Object.entries(m.files).sort(([a], [b]) => (a < b ? -1 : 1)));
  return `${JSON.stringify({ ...m, files }, null, 2)}\n`;
}

export function writeManifest(root: string, m: Manifest) {
  writeIn(root, '.meridian/manifest.json', manifestText(m));
}

/**
 * Where the skill goes: the folders each agent reads in a repository, Codex (`.agents`) and Claude Code (`.claude`), and
 * the file in the payload each is written from. The same list is what `adopt` checks before it writes anything, so a
 * team's own copy is never overwritten behind their back.
 */
export function skillPaths(): { rel: string; payload: string }[] {
  const files = payloadFiles('skills/zz-meridian');
  return ['.agents/skills/zz-meridian', '.claude/skills/zz-meridian'].flatMap((base) =>
    files.map((f) => ({ rel: `${base}/${f.slice('skills/zz-meridian/'.length)}`, payload: f })));
}

/** The agent skill, into the folders each agent reads in a repository. */
export function installSkill(root: string, record?: Record<string, string>) {
  for (const { rel, payload } of skillPaths()) {
    const content = payloadBytes(payload);
    writeIn(root, rel, content);
    if (record) record[rel] = sha256(content);
  }
}

/** Brand flags passed through to scripts/brand.ts, in the order it reads them. */
export const BRAND_FLAGS = ['name', 'workspace', 'timezone', 'currency', 'user', 'role', 'theme', 'accent', 'hex', 'hue', 'chroma'] as const;
export const brandArgs = (brand: Record<string, string>) => BRAND_FLAGS.flatMap((k) => (brand[k] ? [`--${k}`, brand[k]] : []));

/** The brand a run effectively applied: one accent choice (hex over hue over a preset), flags in order, empty ones dropped. */
export function effectiveBrand(flags: Record<string, string | undefined>): Record<string, string> {
  if (flags.theme && flags.theme !== 'dark' && flags.theme !== 'light') throw new Error(`--theme must be dark or light, got ${JSON.stringify(flags.theme)}`);
  const drop = flags.hex ? ['hue', 'chroma', 'accent'] : flags.hue ? ['accent'] : [];
  return Object.fromEntries(BRAND_FLAGS.flatMap((k) => (flags[k] && !drop.includes(k) ? [[k, flags[k]!]] : [])));
}
