/**
 * Migrations a release declares beyond copying files: a change the team must make in code or data that update cannot
 * make for it. A release adds an entry here when it ships such a change; the registry starts empty.
 */
import { isNewer } from './update.js';
import type { Migration } from './update-session.js';

export type ReleaseMigration = {
  id: string;
  /** The release that introduced the change. The entry applies when `source < since <= target`. */
  since: string;
  /** The project paths the change touches, or null when this project does not need it. */
  applies: (root: string) => string[] | null;
  summary: string;
  instructions: string;
  checks: string[];
};

export const RELEASE_MIGRATIONS: ReleaseMigration[] = [];

/** The registry entries that apply to a project moving from `source` to `target`, as journal migrations. */
export function releaseMigrations(root: string, source: string, target: string): Migration[] {
  const out: Migration[] = [];
  for (const m of RELEASE_MIGRATIONS) {
    if (!isNewer(m.since, source) || isNewer(m.since, target)) continue;
    const paths = m.applies(root);
    if (paths) out.push({ id: m.id, summary: m.summary, paths, instructions: m.instructions, checks: m.checks });
  }
  return out;
}
