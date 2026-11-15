/**
 * The Node major CI builds under, read from the project's `.nvmrc` — the one place it is written.
 *
 * `scripts/test-run.ts` used to carry its own copy of the number. Moving the repository's Node major (`.nvmrc` and the
 * workflows) would then have left that line comparing against the old one: a gap reported where there is none, or a real
 * one missing, with nothing to say the copy had gone stale.
 */
import fs from 'node:fs';
import path from 'node:path';

export const CI_NODE_MAJOR = ((): number => {
  try {
    const n = Number.parseInt(fs.readFileSync(path.join(process.cwd(), '.nvmrc'), 'utf8').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 22;
  } catch {
    return 22;
  }
})();
