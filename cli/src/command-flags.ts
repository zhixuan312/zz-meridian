/**
 * Which flags each command reads. A flag that names a mode or a value belongs to the command that acts on it: anywhere
 * else it is refused by name rather than accepted and ignored, so `adopt --dry-run` never modifies a project while the
 * person waits for a preview.
 */
import { BRAND_FLAGS } from './files.js';

/** Every command reads these. */
const EVERYWHERE = ['help', 'version'] as const;
/** The brand flags, read by the commands that write a brand. */
const BRAND = BRAND_FLAGS;
/** What each command reads, beyond the two above. */
const ACCEPTS: Record<string, readonly string[]> = {
  adopt: [...BRAND, 'allow-dirty', 'no-install'],
  create: [...BRAND, 'no-install'],
  update: ['allow-dirty', 'no-install', 'dry-run', 'resume', 'finalize', 'abort', 'verify', 'verbose'],
  brand: [...BRAND, 'allow-dirty'],
  skill: ['global'],
};

/** The commands that read one flag, in the CLI's own order, for the sentence that sends the person to the right one. */
function commandsReading(flag: string): string[] {
  return Object.keys(ACCEPTS).filter((c) => ACCEPTS[c].includes(flag));
}

/**
 * The first flag a command does not read, with the command it belongs to; null when every flag is the command's own.
 * `update` is the one command with no spelling of its own, so a flag only it reads is named as its own.
 */
export function misapplied(command: string, flags: Record<string, unknown>): { flag: string; belongsTo: string } | null {
  const accepted = ACCEPTS[command];
  if (!accepted) return null;
  for (const [flag, value] of Object.entries(flags)) {
    if (value === undefined || EVERYWHERE.includes(flag as (typeof EVERYWHERE)[number]) || accepted.includes(flag)) continue;
    const others = commandsReading(flag);
    return { flag, belongsTo: others.length ? `zz-meridian ${others.join(' or ')}` : 'no command' };
  }
  return null;
}
