/**
 * Whether a change owes the consumer smoke before it is pushed, and which half. The smoke lives in Meridian's own
 * repository (`cli/`): a project made from it has no CLI, and its `scripts/` changes are the release's managed files, not
 * a release being prepared. The tool answers both questions so `test:t2` cannot run it where it does not exist.
 */
import fs from 'node:fs';
import path from 'node:path';

export const SMOKE_SCRIPT = path.join('cli', 'scripts', 'smoke.ts');

/** `update` for the update path, `verify` for any other check change, null when the smoke does not belong here or nothing needs it. */
export function consumerSmokeKind({ root, changed }: { root: string; changed: string[] }): 'update' | 'verify' | null {
  if (!fs.existsSync(path.join(root, SMOKE_SCRIPT))) return null;
  if (changed.some((p) => p.startsWith('cli/') || p === 'scripts/lib/update-session.ts')) return 'update';
  if (changed.some((p) => p.startsWith('scripts/'))) return 'verify';
  return null;
}
