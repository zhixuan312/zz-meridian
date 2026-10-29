/**
 * Which flags each command reads. A flag that names a mode or a value belongs to the command that acts on it: anywhere
 * else it is refused by name rather than accepted and ignored, so `adopt --dry-run` never modifies a project while the
 * person waits for a preview.
 */
import { parseArgs } from 'node:util';
import { BRAND_FLAGS } from './files.js';

/**
 * The command line, read: its flags and positionals, or the reason it cannot be read (an unknown flag, a value-less one),
 * as one line for the person rather than a stack trace.
 */
export function readFlags(args: string[]): { values: Record<string, string | boolean | undefined>; positionals: string[] } | { error: string } {
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        ...Object.fromEntries(BRAND_FLAGS.map((f) => [f, { type: 'string' as const }])),
        'allow-dirty': { type: 'boolean' },
        'no-install': { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        resume: { type: 'boolean' },
        finalize: { type: 'boolean' },
        abort: { type: 'boolean' },
        verify: { type: 'boolean' },
        verbose: { type: 'boolean' },
        global: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });
    return { values: { ...values }, positionals };
  } catch (e) {
    // Node's first sentence names the flag; the rest is about positionals that start with a dash.
    return { error: (e as Error).message.split('. ')[0] };
  }
}

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
