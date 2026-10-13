// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * No client module of the product's pages runs the company's generator. `src/system/fixtures/company.ts` makes a year
 * of days, four models' usage, the compute and 329 customers each time it is loaded: the server reads it, and a browser
 * is handed the figures a page draws. A client view imports `src/data/sample.ts` for a type, a list of names or a pure
 * function, so this walks what each client module of `src/views/` and of the pages imports, by value and all the way
 * down, and fails when the walk reaches the generator. The Atlas's own modules and the cards' previews draw the sample
 * and may import it; they are not walked from.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const GENERATOR = 'src/system/fixtures/company.ts';
const APP = ['app', 'src/app'].find((dir) => fs.existsSync(path.join(ROOT, dir))) ?? 'app';

const walk = (dir: string): string[] =>
  fs.existsSync(path.join(ROOT, dir))
    ? fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : []))
    : [];
const source = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
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

const clients = [...walk('src/views'), ...walk(APP).filter((f) => !f.startsWith(`${APP}/system/`))].filter((f) => directive(f) === 'client');
/** A product that has replaced the sample has no generator to keep out of its browser, and nothing here to hold. */
const SAMPLE = fs.existsSync(path.join(ROOT, GENERATOR)) && fs.existsSync(path.join(ROOT, 'src/data/sample.ts'));

describe.skipIf(!SAMPLE)('the client modules of the product\'s pages', () => {
  it('are found, and the walk follows an import all the way down', () => {
    expect(clients.length).toBeGreaterThan(0);
    // The walk is real: a server module that serves the records reaches the generator, through an alias and a value import.
    expect(reaches('src/data/collections.ts')).toEqual(['src/data/collections.ts', GENERATOR]);
    // And a type-only import is not followed: a module that takes only types from the sample does not import it.
    expect(imports('src/data/metrics.ts')).not.toContain('src/data/sample.ts');
    expect(imports('src/data/requests.ts')).toContain('src/data/sample.ts');
  });

  it('never reach the module that generates the company\'s records', () => {
    const found = clients.map(reaches).filter((trail): trail is string[] => trail !== null).map((trail) => trail.join(' -> '));
    expect(found, `${found.length} client modules reach ${GENERATOR}:\n${found.join('\n')}`).toEqual([]);
  });

  it('what a view shares with the browser from the sample names no record of the company', () => {
    expect(reaches('src/data/sample.ts')).toBeNull();
  });
});
