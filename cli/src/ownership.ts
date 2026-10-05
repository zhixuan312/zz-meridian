/**
 * Which files Meridian manages in a project, and what `update` does with each: pure functions over text, file lists and
 * hashes, with no I/O, so the same answer comes back on every run and the rule can be tested without a project.
 */
import type { Manifest } from './files.js';

/** A content hash as the manifest records it, or null for a file that is absent. */
export type Hash = `sha256-${string}` | null;

export type Disposition = 'untouched' | 'edited' | 'added' | 'removed' | 'local-deletion' | 'collision' | 'team-preserved';
export type Action = 'write' | 'delete' | 'stage' | 'leave';

const HASH = /^sha256-[0-9a-f]{64}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

/** The library modules Meridian's components and gates import; the rest of src/lib belongs to the template's pages. */
export const LIB = ['cn', 'format', 'format-date', 'period', 'color', 'host', 'preferences', 'csv', 'safe-markdown'].map((n) => `src/lib/${n}.ts`);

/** The single files adopt copies besides the folders and the library: all of them must be in a payload that is whole. */
export const FIXED = [...LIB, 'src/lib/assistant/prompt.ts', 'src/views/console-chrome.tsx', 'tests/setup.ts'];

/** The raw `.meridian/manifest.json`, checked field by field; anything off throws an Error that names it. */
export function parseManifest(text: string): Manifest {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { throw new Error(`manifest is not JSON: ${(e as Error).message}`); }
  const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
  if (!isObject(raw)) throw new Error('manifest must be a JSON object');
  const { version, route, brand, files } = raw;
  if (typeof version !== 'string' || !SEMVER.test(version)) throw new Error(`manifest version must be x.y.z, got ${JSON.stringify(version)}`);
  if (route !== 'adopt' && route !== 'create') throw new Error(`manifest route must be "adopt" or "create", got ${JSON.stringify(route)}`);
  if (!isObject(brand)) throw new Error('manifest brand must be an object');
  if (!isObject(files)) throw new Error('manifest files must be an object');
  for (const [k, v] of Object.entries(brand)) if (typeof v !== 'string') throw new Error(`manifest brand.${k} must be a string`);
  for (const [p, h] of Object.entries(files)) {
    if (p === '' || p.startsWith('/') || /^[A-Za-z]:/.test(p) || p.includes('\\') || p.split('/').includes('..')) throw new Error(`manifest path ${JSON.stringify(p)} must be relative, non-empty, with no ".." and no backslash`);
    if (typeof h !== 'string' || !HASH.test(h)) throw new Error(`manifest hash for ${p} must be sha256-<64 lowercase hex>`);
  }
  return { version, route, brand: brand as Record<string, string>, files: files as Record<string, string> };
}

/** What adopt copies from the template, as payload paths: its rule applied to one release's file list, sorted. */
export function adoptSetOf(payloadFiles: readonly string[]): string[] {
  const own = (f: string) => !/(^|\/)(README\.md|preview\.tsx)$/.test(f);
  const fixed = new Set(FIXED);
  return payloadFiles
    .filter((f) => f.startsWith('tokens/') || f.startsWith('src/styles/')
      || (f.startsWith('src/components/') && own(f))
      || (f.startsWith('scripts/') && f !== 'scripts/verify.config.ts')
      || fixed.has(f))
    .sort();
}

/** The adopt set plus the skill, in the two folders it is installed to. The same for both routes. */
export function managedPaths(payloadFiles: readonly string[], _route: 'adopt' | 'create'): Set<string> {
  const out = new Set(adoptSetOf(payloadFiles));
  const prefix = 'skills/zz-meridian/';
  for (const f of payloadFiles) {
    if (!f.startsWith(prefix)) continue;
    for (const base of ['.agents/skills/zz-meridian', '.claude/skills/zz-meridian']) out.add(`${base}/${f.slice(prefix.length)}`);
  }
  return out;
}

/** What `update` does with one path, from the hash it recorded, the one in the target release and the one on disk. */
export function classify(i: { recorded: Hash; target: Hash; disk: Hash; managed: boolean }): { disposition: Disposition; action: Action } {
  const { recorded, target, disk, managed } = i;
  for (const [side, h] of [['recorded', recorded], ['target', target], ['disk', disk]] as const) {
    if (h !== null && !HASH.test(h)) throw new Error(`${side} hash must be sha256-<64 lowercase hex> or null, got ${JSON.stringify(h)}`);
  }
  const out = (disposition: Disposition, action: Action) => ({ disposition, action });
  if (!managed) return out('team-preserved', 'leave');
  if (recorded !== null && target !== null) {
    if (disk === null) return out('local-deletion', 'stage');
    if (disk === recorded) return out('untouched', target === recorded ? 'leave' : 'write');
    return out('edited', disk === target ? 'leave' : 'stage');
  }
  if (recorded !== null) return out('removed', disk === null ? 'leave' : disk === recorded ? 'delete' : 'stage');
  if (target === null) return out('untouched', 'leave');
  if (disk === null) return out('added', 'write');
  return disk === target ? out('added', 'leave') : out('collision', 'stage');
}
