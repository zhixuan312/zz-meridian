/**
 * The agent-facing context a project carries: the frozen managed block in `AGENTS.md` and the brief template.
 * Pure text in, text out; the caller does the reading and writing.
 */
export const BEGIN = '<!-- BEGIN:zz-meridian-agent-rules -->';
export const END = '<!-- END:zz-meridian-agent-rules -->';

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

const BLOCK = `${BEGIN}
# Built on ZZ Meridian <version>

Follow the zz-meridian skill in \`.agents/skills/zz-meridian/SKILL.md\`.
Read \`optional:docs/brief.md\` for this team's product, users, data and decisions.
When it is absent, use the skill's brief template with the person's answers; do not invent product facts.

- What is yours: product pages, data, other team files, \`src/app.config.ts\` and \`scripts/verify.config.ts\`.
  Managed paths are recorded in \`.meridian/manifest.json\`; declared kept divergences are in
  \`optional:.meridian/keep.json\`. Explicit shared-file operations are described by the skill.
- Extend rather than edit: follow \`.agents/skills/zz-meridian/references/customize.md\`.
- Update: follow \`.agents/skills/zz-meridian/references/update.md\`. Installed files do not mean a completed
  upgrade: resolve the report and run the pinned finalization command.
- Before finishing: safely configured \`pnpm verify\` for the default gate/build/smoke path; report any partial coverage.
  Use \`pnpm gate\` alone for static feedback. Do not automatically chain it before verify, which already runs it.
  Use \`pnpm verify --full\` or \`pnpm verify --perf\` when deep checks are requested; release CI runs both.
- Agents in the product read through authorized collections and write only through an approved Proposal.
${END}`;

/** The brief a team keeps at `docs/brief.md`; its guidance lines equal `BRIEF_GUIDANCE` in the assistant prompt. */
export const BRIEF_TEMPLATE = `# Product name

## Product
What this dashboard is for, in two or three sentences: who opens it, what decision it helps them make.

## Users
Who uses it and how often; what they know already; what they must never be shown.

## Data
Where the numbers come from (systems, tables, APIs), how fresh they are, and what now means for this product.

## Decisions
Brand, layout and behaviour choices already made, one line each with its reason, so no session re-decides them.

## Glossary
The team's own words for things, one per line: term and what it means here.
`;

/** One `pnpm <script> [flags]` command, spelled for the package manager; npm needs `--` before flags. */
function command(pm: PackageManager, script: string, flags: string): string {
  if (pm === 'pnpm') return `pnpm ${script}${flags}`;
  if (pm === 'npm') return `npm run ${script}${flags ? ` --${flags}` : ''}`;
  return `${pm === 'bun' ? 'bun run' : 'yarn'} ${script}${flags}`;
}

/** The frozen managed block for a version, with every script command in the project's package manager. */
export function managedBlock(version: string, pm: PackageManager): string {
  return BLOCK.replace('<version>', () => version).replace(/`pnpm ([a-z]+)((?: [^`]+)?)`/g, (_m, script: string, flags: string) => `\`${command(pm, script, flags)}\``);
}

const count = (text: string, needle: string) => text.split(needle).length - 1;

/** Put the block into an `AGENTS.md` text: replace the marked span, else an exact legacy section, else append. Refuses anything ambiguous. */
export function upsertManagedBlock(text: string, block: string, legacy?: string): string {
  const begins = count(text, BEGIN);
  const ends = count(text, END);
  const legacies = legacy ? count(text, legacy) : 0;
  if (begins > 1 || ends > 1) throw new Error('AGENTS.md has a duplicate managed block marker; remove the extra one and run again.');
  if (legacies > 1) throw new Error('AGENTS.md has a duplicate legacy section; remove the extra copy and run again.');
  const begin = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  if (begins !== ends || end < begin) throw new Error('AGENTS.md has an unterminated managed block; each marker needs its partner, BEGIN first.');
  if (begins === 1 && legacies === 1) throw new Error('AGENTS.md has both a managed block and a legacy section; remove one and run again.');
  if (begins === 1) return text.slice(0, begin) + block + text.slice(end + END.length);
  if (legacy && legacies === 1) {
    const at = text.indexOf(legacy);
    return text.slice(0, at) + block + text.slice(at + legacy.length);
  }
  if (legacy && text.includes(legacy.split('\n')[0]!)) throw new Error('AGENTS.md has an edited legacy section; replace it by hand with the managed block.');
  if (text === '') return `${block}\n`;
  return `${text}${text.endsWith('\n') ? '' : '\n'}\n${block}\n`;
}
