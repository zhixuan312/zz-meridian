// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * No client module of the product's pages reaches a module that reads the company's records.
 *
 * `src/data/` holds two kinds of module: the reads, which resolve the caller's access and fetch rows (`read()`,
 * `readAll()`, `aggregate()`, `collectionFor()`, `resolveAccess()`, `can()`), and pure helpers over values a page
 * already has, which a client may import — `src/data/verification.ts` is three rules over runs and releases. A reading
 * module is decided by what a module does, with its comments blanked, not by where it sits: a client that reaches one
 * would run access resolution and a fetch in a browser. This walks what each client module of `src/views/`, of
 * `src/components/` and of the pages imports, by value and all the way down, and fails when the walk reaches a reading
 * module. The Atlas's own modules and the cards' previews draw the sample and may import it; they are not walked from,
 * so the `src/components/` root skips every preview module. A `'use server'` module stops the walk: its module is a
 * reference in the browser and not its body.
 *
 * The sample adds a second boundary, guarded: no client module reaches `src/system/fixtures/company.ts`, which makes a
 * year of days, four models' usage, the compute and 329 customers each time it is loaded. A product that has replaced
 * the sample has no generator to keep out of its browser, so only the reading-module boundary can speak there — and it
 * does, unguarded.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const GENERATOR = 'src/system/fixtures/company.ts';
const APP = ['app', 'src/app'].find((dir) => fs.existsSync(path.join(ROOT, dir))) ?? 'app';

const walk = (dir: string): string[] =>
  fs.existsSync(path.join(ROOT, dir))
    ? fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : []))
    : [];
const source = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
/** Comments blanked, not removed, so a scan reads code and a line number is still the file's. */
const blanked = (file: string) => source(file).replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/[^\n]*/g, '$1');
/** The directive a module opens with, past any comment above it. */
const directive = (file: string) => /^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)*['"]use (client|server)['"]/.exec(source(file))?.[1] ?? null;

/** The file a specifier names, or null for a package or a file that is not source. */
function resolve(from: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? `src/${spec.slice(2)}` : spec.startsWith('.') ? path.posix.join(path.posix.dirname(from), spec) : null;
  if (!base) return null;
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((f) => /\.tsx?$/.test(f) && fs.existsSync(path.join(ROOT, f))) ?? null;
}

/** Every module `file` imports or re-exports by value. A type-only import is erased before anything runs, so it is not one. */
function imports(file: string): string[] {
  const code = source(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const found: string[] = [];
  for (const m of code.matchAll(/\b(?:import|export)\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]/g)) {
    const [, typeOnly, clause, spec] = m;
    const names = /^\{([^}]*)\}$/.exec(clause.trim())?.[1].split(',').map((n) => n.trim()).filter(Boolean);
    if (typeOnly || names?.every((n) => /^type\s/.test(n))) continue;
    found.push(spec);
  }
  for (const m of code.matchAll(/\bimport\s*(?:\(\s*)?['"]([^'"]+)['"]/g)) found.push(m[1]);
  return [...new Set(found)].map((spec) => resolve(file, spec)).filter((f): f is string => f !== null);
}

/** The chain of imports from `start` to the generator, or null when the walk never reaches it. A Server Action stays on the server: its module is a reference in the browser, so the walk stops there. */
function reaches(start: string): string[] | null {
  const seen = new Set<string>([start]);
  const queue: string[][] = [[start]];
  while (queue.length) {
    const trail = queue.shift()!;
    for (const next of imports(trail.at(-1)!)) {
      if (next === GENERATOR) return [...trail, next];
      if (seen.has(next) || directive(next) === 'server') continue;
      seen.add(next);
      queue.push([...trail, next]);
    }
  }
  return null;
}

/** The six calls that make a module a reading module: access resolved and records fetched, never a pure helper. */
const READS = /\b(?:read|readAll|aggregate|collectionFor|resolveAccess|can)\s*\(/;
/** A module that reads: one under `src/data/` whose own source, comments blanked, calls one of the six. */
const reading = (file: string) => /^src\/data\//.test(file) && READS.test(blanked(file));

/** The chain of imports from `start` to the first module that reads, or null when the walk never reaches one. A Server Action stays on the server, so the walk stops there. */
function reachesReading(start: string): string[] | null {
  const seen = new Set<string>([start]);
  const queue: string[][] = [[start]];
  while (queue.length) {
    const trail = queue.shift()!;
    for (const next of imports(trail.at(-1)!)) {
      if (seen.has(next) || directive(next) === 'server') continue;
      if (reading(next)) return [...trail, next];
      seen.add(next);
      queue.push([...trail, next]);
    }
  }
  return null;
}

const clients = [
  ...walk('src/views'),
  ...walk('src/components').filter((f) => !/(^|\/)preview\.tsx$/.test(f)),
  ...walk(APP).filter((f) => !f.startsWith(`${APP}/system/`)),
].filter((f) => directive(f) === 'client');
/** A product that has replaced the sample has no generator to keep out of its browser; the sample boundary below is the template's. */
const SAMPLE = fs.existsSync(path.join(ROOT, GENERATOR)) && fs.existsSync(path.join(ROOT, 'src/data/sample.ts'));

describe("the client modules of the product's pages", () => {
  it('are found', () => {
    expect(clients.length).toBeGreaterThan(0);
  });

  it('never reach a module that reads', () => {
    const found = clients.map(reachesReading).filter((trail): trail is string[] => trail !== null).map((trail) => trail.join(' -> '));
    expect(found, `${found.length} client modules reach a module that reads:\n${found.join('\n')}`).toEqual([]);
  });
});

describe.skipIf(!SAMPLE)("the sample's walk to the generator", () => {
  it('follows an import all the way down', () => {
    // The walk is real: a server module that serves the records reaches the generator, through an alias and a value import.
    expect(reaches('src/data/collections.ts')).toEqual(['src/data/collections.ts', GENERATOR]);
    // And a type-only import is not followed: a module that takes only types from the sample does not import it.
    expect(imports('src/data/metrics.ts')).not.toContain('src/data/sample.ts');
    expect(imports('src/data/requests.ts')).toContain('src/data/sample.ts');
  });

  it('is not reached from any client module', () => {
    const found = clients.map(reaches).filter((trail): trail is string[] => trail !== null).map((trail) => trail.join(' -> '));
    expect(found, `${found.length} client modules reach ${GENERATOR}:\n${found.join('\n')}`).toEqual([]);
  });

  it('what a view shares with the browser from the sample names no record of the company', () => {
    expect(reaches('src/data/sample.ts')).toBeNull();
  });
});
