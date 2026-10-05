// Plans the permitted edits to package.json and AGENTS.md during `update`. Pure: no I/O, nothing thrown;
// every case it may not settle becomes a Migration.
import { builtinModules } from 'node:module';
import { upsertManagedBlock } from './context.js';
import type { Migration } from './update-session.js';

/** Adopt's dev dependencies and scripts, which `update` also needs. They mirror `DEV_DEPS` and `SCRIPTS` in adopt.ts. */
export const TOOLCHAIN = ['typescript', '@types/node', '@types/react', '@types/react-dom', 'tailwindcss', '@tailwindcss/postcss', 'eslint', 'eslint-config-next', 'vitest', '@vitejs/plugin-react', 'jsdom', '@testing-library/react', '@testing-library/jest-dom'];
export const MERIDIAN_SCRIPTS = ['typecheck', 'test', 'tokens', 'check', 'contrast', 'gate', 'audit', 'verify', 'brand', 'shot', 'interactions', 'keyboard', 'vitals'];

export type Template = { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> };
export type Need = { runtime: string[]; dev: string[]; scripts: string[] };
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The minimum version of `x.y.z`, `^x.y.z`, `~x.y.z` or `>=x.y.z`; null for anything else. */
function minimum(spec: unknown): [number, number, number] | null {
  const m = typeof spec === 'string' ? /^(?:\^|~|>=)?(\d+)\.(\d+)\.(\d+)$/.exec(spec.trim()) : null;
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
const compare = (a: number[], b: number[]) => a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!;

const file = (id: string, summary: string, instructions: string, path: string): Migration => ({ id, summary, paths: [path], instructions, checks: [] });

/** Add or reconcile the declared dependencies and scripts of a team's package.json at the target template's specification. */
export function reconcilePackage(teamText: string, template: Template, need: Need): { text: string | null; changes: string[]; migrations: Migration[] } {
  const unreadable = (why: string) => ({
    text: null,
    changes: [],
    migrations: [file('package-json', `package.json could not be reconciled: ${why}`, `Meridian did not touch package.json because ${why}. Add the dependencies and scripts the target template declares by hand, keeping any comments or nonstandard syntax, then run the project's gate.`, 'package.json')],
  });
  let pkg: unknown;
  try {
    pkg = JSON.parse(teamText);
  } catch {
    return unreadable('it is not plain JSON (comments or other syntax cannot be rewritten safely)');
  }
  if (!isObj(pkg)) return unreadable('its top level is not an object');

  const changes: string[] = [];
  const migrations: Migration[] = [];
  const section = (key: string): Obj | null => {
    if (pkg[key] === undefined) return null;
    return isObj(pkg[key]) ? (pkg[key] as Obj) : null;
  };
  for (const key of ['dependencies', 'devDependencies', 'scripts']) {
    if (pkg[key] !== undefined && !isObj(pkg[key])) return unreadable(`"${key}" is not an object`);
  }

  const wanted: Array<[string, 'dependencies' | 'devDependencies']> = [
    ...need.runtime.map((n) => [n, 'dependencies'] as [string, 'dependencies']),
    ...need.dev.map((n) => [n, 'devDependencies'] as [string, 'devDependencies']),
  ];
  const additions: Record<'dependencies' | 'devDependencies', Record<string, string>> = { dependencies: {}, devDependencies: {} };

  for (const [name, target] of wanted) {
    const spec = template[target]?.[name];
    if (spec === undefined) continue;
    const holder = (['dependencies', 'devDependencies'] as const).map((k) => section(k)).find((s) => s && s[name] !== undefined) ?? null;
    if (!holder) {
      additions[target][name] = spec;
      changes.push(`added ${name} ${spec}`);
      continue;
    }
    const have = holder[name];
    const haveMin = minimum(have);
    const wantMin = minimum(spec);
    const dep = (summary: string, how: string) => migrations.push(file(`dependency:${name}`, summary, how, 'package.json'));
    if (!haveMin || !wantMin) {
      dep(`${name} is declared as ${JSON.stringify(have)}, a specification Meridian cannot compare`, `Meridian ${target === 'dependencies' ? 'needs' : 'tests with'} ${name} ${spec}. Replace the nonstandard requirement ${JSON.stringify(have)} with one that is at least ${spec}, or confirm in writing that your pinned source is compatible, then run the project's gate.`);
      continue;
    }
    const order = compare(haveMin, wantMin);
    if (order === 0) continue;
    if (order > 0) {
      dep(`${name} ${have} is newer than the tested ${spec}`, `Meridian is tested against ${name} ${spec}; your ${have} is newer and was left as it is. Run the project's gate and build with it, and read the ${name} release notes for breaking changes before relying on it.`);
    } else if (haveMin[0] !== wantMin[0]) {
      dep(`${name} ${have} is an older major than the tested ${spec}`, `Meridian is tested against ${name} ${spec}; your ${have} is a lower major and is incompatible. Follow the ${name} upgrade guide to reach ${spec}, then run the project's gate.`);
    } else {
      // An older entry of the same major is compatible: raised where it is. A lower major is the team's to upgrade, above.
      holder[name] = spec;
      changes.push(`raised ${name} from ${have} to ${spec}`);
    }
  }

  const overrideSources: Array<[string, Obj | null]> = [
    ['overrides', section('overrides')],
    ['resolutions', section('resolutions')],
    ['pnpm.overrides', isObj(pkg.pnpm) && isObj(pkg.pnpm.overrides) ? pkg.pnpm.overrides : null],
  ];
  for (const name of new Set([...need.runtime, ...need.dev])) {
    for (const [where, src] of overrideSources) {
      if (src && Object.keys(src).some((k) => k === name || k.startsWith(`${name}@`))) {
        migrations.push(file(`dependency-override:${name}`, `${where} overrides ${name}`, `Your ${where} entry for ${name} replaces the version Meridian is tested with. Remove it or confirm it still satisfies the target's tested requirement, then run the project's gate.`, 'package.json'));
        break;
      }
    }
  }

  const scripts = section('scripts');
  const addedScripts: Record<string, string> = {};
  for (const name of need.scripts) {
    const want = template.scripts?.[name];
    if (want === undefined) continue;
    const have = scripts?.[name];
    if (have === undefined) {
      addedScripts[name] = want;
      changes.push(`added script ${name}`);
    } else if (have !== want) {
      migrations.push(file(`script:${name}`, `script "${name}" differs from Meridian's`, `Your "${name}" script is ${JSON.stringify(have)} and was kept; Meridian's is ${JSON.stringify(want)}. Merge the two so the project's gate can call it, or leave yours if it already does the same work.`, 'package.json'));
    }
  }

  if (changes.length === 0) return { text: null, changes, migrations };

  for (const key of ['dependencies', 'devDependencies'] as const) {
    if (Object.keys(additions[key]).length) pkg[key] = { ...(section(key) ?? {}), ...additions[key] };
  }
  if (Object.keys(addedScripts).length) pkg.scripts = { ...(scripts ?? {}), ...addedScripts };

  const indent = /^[ \t]+(?=")/m.exec(teamText)?.[0] ?? 2;
  const eol = teamText.includes('\r\n') ? '\r\n' : '\n';
  const out = JSON.stringify(pkg, null, indent).replace(/\n/g, eol) + eol;
  return { text: out, changes, migrations };
}

const BUILTINS = new Set(builtinModules);
const IMPORTS = [
  /\b(?:import|export)\s[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]/g,
];

/** The package names that the `.ts` and `.tsx` files import, sorted. */
export function externalPackages(files: ReadonlyMap<string, string>): string[] {
  const found = new Set<string>();
  for (const [name, text] of files) {
    if (!/\.tsx?$/.test(name)) continue;
    for (const re of IMPORTS) {
      for (const m of text.matchAll(re)) {
        const spec = m[1]!;
        if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:') || spec.startsWith('@/') || spec.startsWith('@meridian/')) continue;
        const parts = spec.split('/');
        const pkg = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
        if (pkg && !BUILTINS.has(pkg) && !BUILTINS.has(pkg.split('/')[0]!)) found.add(pkg);
      }
    }
  }
  return [...found].sort();
}

/** The `AGENTS.md` text the base release's own replay wrote, from its Meridian heading to the end. */
export function legacySection(baseAgents: string | null, route: 'adopt' | 'create'): string | undefined {
  if (baseAgents === null) return undefined;
  const heading = route === 'adopt' ? '# Built on ZZ Meridian' : '# Working in this dashboard';
  const m = new RegExp(`^${heading}\\s*$`, 'm').exec(baseAgents);
  return m ? baseAgents.slice(m.index).trimEnd() : undefined;
}

/** Plan the `AGENTS.md` edit: only the managed block or the exact legacy section changes; a missing file stays missing. */
export function planAgents(text: string | null, block: string, legacy?: string): { text: string | null; migration: Migration | null } {
  if (text === null) return { text: null, migration: null };
  try {
    const next = upsertManagedBlock(text, block, legacy);
    return { text: next === text ? null : next, migration: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { text: null, migration: file('agents-md', 'AGENTS.md could not be updated safely', `AGENTS.md was not written. ${reason} Then make the managed block current by hand or run update again.`, 'AGENTS.md') };
  }
}
