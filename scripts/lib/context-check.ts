/**
 * Pure checks for the agent-facing context a project keeps: the product brief (`docs/brief.md`) and the references its
 * instruction documents make to files and package scripts. No I/O here: the caller reads the files and says what exists.
 */
import path from 'node:path';
import { BRIEF_GUIDANCE } from '../../src/lib/assistant/prompt.ts';

/** The headings a brief must have, once each, in the order the template writes them. */
const REQUIRED = ['Product', 'Users', 'Data', 'Decisions', 'Glossary'] as const;

/**
 * Check a brief. A required `## ` heading that is missing or appears twice is an error; a section whose only non-blank
 * line is its own guidance line (the template, untouched) is a warning, because it has not been written yet.
 */
export function checkBrief(text: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sections = new Map<string, string[][]>();
  let current: string[] | null = null;
  let fenced = false;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const heading = fenced ? null : /^## (.+?)\s*$/.exec(line);
    if (heading) {
      current = [];
      sections.set(heading[1], [...(sections.get(heading[1]) ?? []), current]);
    } else if (!fenced && /^#{1,2} /.test(line)) current = null;
    else current?.push(line);
  }
  for (const name of REQUIRED) {
    const found = sections.get(name) ?? [];
    if (found.length === 0) errors.push(`missing required heading "## ${name}"`);
    else if (found.length > 1) errors.push(`heading "## ${name}" appears ${found.length} times`);
    else {
      const body = found[0].map((l) => l.trim()).filter(Boolean);
      if (body.length === 0 || (body.length === 1 && body[0] === BRIEF_GUIDANCE[name])) warnings.push(`"## ${name}" is still the template guidance; write it`);
    }
  }
  return { errors, warnings };
}

/** A path reference starts with one of these, after an optional `required:`, `optional:` or `example:`. */
const PATH_ROOTS = ['.agents/', '.claude/', 'src/', 'app/', 'scripts/', 'docs/', '.meridian/', 'tokens/', 'tests/', 'references/', 'decisions/', 'journeys/', 'README.md', 'CONTRIBUTING.md'];

/**
 * The roots a project may genuinely lack, so a fenced command that names one is read too. A fence holds commands,
 * examples and placeholders, so every other root stays unchecked there.
 */
const FENCED_ROOTS = ['decisions/', 'journeys/', 'README.md', 'CONTRIBUTING.md'];

/** `pnpm <name>`, `pnpm run <name>`, `npm run <name>`, `yarn <name>` or `bun run <name>`, then nothing, ` -- ...` or flags. */
const SCRIPT = /^(pnpm run|pnpm|npm run|yarn|bun run) ([\w:.-]+)(?: --(?: .*)?| -.*)?$/;
/** What a bare `pnpm <name>` or `yarn <name>` runs as the package manager's own command, never a package script. */
const OWN_COMMANDS = new Set(['add', 'approve-builds', 'audit', 'bin', 'config', 'create', 'dedupe', 'deploy', 'dlx', 'env', 'exec', 'fetch', 'i', 'import', 'init', 'install', 'licenses', 'link', 'list', 'ls', 'outdated', 'pack', 'patch', 'prune', 'publish', 'rebuild', 'remove', 'rm', 'root', 'setup', 'store', 'uninstall', 'unlink', 'up', 'update', 'upgrade', 'why']);

/** The problem one path reference makes, if any: a root it starts with, a filter that admits it, and whether it is held. */
function pathProblem(
  ref: string,
  prefix: string | undefined,
  at: string,
  file: string,
  roots: readonly string[],
  exists: (path: string) => boolean,
): string | null {
  if (!roots.some((r) => ref.startsWith(r)) || /[*?<>{} ]/.test(ref)) return null;
  if (prefix === 'optional') return null;
  const target = ref.startsWith('references/') ? path.posix.join(path.posix.dirname(file), ref) : ref;
  const asGiven = ref.endsWith('/') && !target.endsWith('/') ? `${target}/` : target;
  return exists(asGiven) ? null : `${at}: path "${asGiven}" does not exist`;
}

/**
 * Check what documents point at. Outside a fence only inline code spans count; inside one, a bare word that starts with
 * `FENCED_ROOTS` is read too, because a project may lack those and a fenced command still has to tell the truth. A path
 * reference must exist, unless it is `optional:` or `example:`; a script reference must be in `scripts`. Globs,
 * placeholders, URLs, `node_modules/` paths and plain words are not references. `references/...` resolves against the
 * document's own folder, everything else from the repository root. `docs[i].file` is repository-relative and
 * `firstLine` (default 1) is the line of `text`'s first line in it. Returns one `<file>:<line>: <what is missing>`.
 */
export function scanReferences(
  docs: { file: string; text: string; firstLine?: number }[],
  exists: (path: string) => boolean,
  scripts: ReadonlySet<string>,
): string[] {
  const problems: string[] = [];
  for (const { file, text, firstLine = 1 } of docs) {
    let fenced = false;
    text.split('\n').forEach((line, i) => {
      const at = `${file}:${firstLine + i}`;
      if (/^\s*```/.test(line)) {
        fenced = !fenced;
        return;
      }
      if (fenced) {
        for (const token of line.split(/\s+/)) {
          const prefix = /^(required|optional|example):/.exec(token)?.[1];
          if (prefix === 'example') continue;
          const ref = prefix ? token.slice(prefix.length + 1) : token;
          const problem = pathProblem(ref, prefix, at, file, FENCED_ROOTS, exists);
          if (problem) problems.push(problem);
        }
        return;
      }
      for (const [, span] of line.matchAll(/`([^`]+)`/g)) {
        const prefix = /^(required|optional|example):/.exec(span)?.[1];
        if (prefix === 'example') continue;
        const ref = prefix ? span.slice(prefix.length + 1) : span;
        const script = SCRIPT.exec(ref);
        if (script) {
          const [, runner, name] = script;
          const own = (runner === 'pnpm' || runner === 'yarn') && OWN_COMMANDS.has(name);
          if (!own && !scripts.has(name)) problems.push(`${at}: package script "${name}" is not in package.json`);
          continue;
        }
        const problem = pathProblem(ref, prefix, at, file, PATH_ROOTS, exists);
        if (problem) problems.push(problem);
      }
    });
  }
  return problems;
}
