#!/usr/bin/env node
/**
 * zz-meridian: bring ZZ Meridian into a Next.js project, or start a new dashboard on it. The package copies files in
 * and installs the agent skill; nothing in the dashboard depends on it afterwards.
 */
import os from 'node:os';
import path from 'node:path';
import { adopt } from './adopt.js';
import { misapplied, readFlags } from './command-flags.js';
import { create } from './create.js';
import { BRAND_FLAGS, VERSION, installSkill } from './files.js';
import { brandCommand } from './rebrand.js';
import { update, type Mode } from './update.js';

const HELP = `zz-meridian ${VERSION}

  npx zz-meridian@latest adopt [brand flags] [--allow-dirty] [--no-install]
      Bring Meridian into the Next.js App Router project in this folder, keeping its routes and data layer.

  npx zz-meridian@latest create <dir> [brand flags] [--no-install]
      Start a new dashboard on Meridian in <dir>.

  npx zz-meridian@latest update --dry-run [--verbose]
      Show what updating this project to the running version would change, and what needs your decision. Writes nothing.

  npx zz-meridian@latest update [--allow-dirty] [--no-install] [--verbose]
      Apply the safe changes, stage everything you changed with base/ours/new copies, and write .meridian/update/<version>/MERGE.md.

  npx zz-meridian@<version> update --resume [--no-install] | --finalize [--verify] | --abort
      Continue, complete or roll back the update in progress. Use the version named in MERGE.md.

  npx zz-meridian@<installed version> brand [brand flags] [--allow-dirty]
      Change this project's brand with no hand edits: the brand outputs, src/app.config.ts and the manifest move together, or nothing changes.
      Use the version in .meridian/manifest.json; a project on an older release runs update first.

  npx zz-meridian@latest skill [--global]
      Install only the agent skill: into this project, or for every project (~/.agents/skills, ~/.claude/skills).

Brand flags: --name "Acme Ops" --workspace Production --timezone Europe/London --currency EUR
             --user "Ada Park" --role Admin --accent indigo|cobalt|jade|graphite | --hex '#2E6BE4' | --hue 250 --chroma 0.14

Then give your coding agent the skill: .agents/skills/zz-meridian/SKILL.md.`;

const read = readFlags(process.argv.slice(2));
if ('error' in read) {
  console.error(`zz-meridian: ${read.error}. zz-meridian --help lists the commands and their flags.`);
  process.exit(1);
}
const { values: flags, positionals } = read;
const brand = Object.fromEntries(BRAND_FLAGS.flatMap((f) => (typeof flags[f] === 'string' ? [[f, flags[f] as string]] : [])));
const install = !flags['no-install'];
const [command, arg] = positionals;

function main(): number {
  if (flags.version) { console.log(VERSION); return 0; }
  // A brand value is written into TypeScript and JSON; refuse what could end its string before anything is copied.
  const unsafe = Object.entries(brand).find(([, v]) => /[\\\r\n\u2028\u2029]/.test(v));
  if (unsafe) { console.error(`zz-meridian: --${unsafe[0]} may not contain a backslash or a line break`); return 1; }
  if (flags.help || !command) { console.log(HELP); return command || flags.help ? 0 : 1; }
  // A flag a command does not read is refused, never ignored: `adopt --dry-run` wrote the project rather than previewing it.
  const wrong = misapplied(command, flags);
  if (wrong) { console.error(`zz-meridian ${command}: --${wrong.flag} belongs to ${wrong.belongsTo}`); return 1; }
  if (command === 'adopt') return adopt({ root: process.cwd(), brand, allowDirty: Boolean(flags['allow-dirty']), install });
  if (command === 'create') {
    if (!arg) { console.error('zz-meridian create: name the folder for the new dashboard'); return 1; }
    return create({ dir: arg, brand, install });
  }
  if (command === 'update') {
    const modes = (['dry-run', 'resume', 'finalize', 'abort'] as const).filter((m) => flags[m]);
    if (modes.length > 1) { console.error(`zz-meridian update: ${modes.map((m) => `--${m}`).join(' and ')} cannot be combined`); return 1; }
    if (flags.verify && !flags.finalize) { console.error('zz-meridian update: --verify belongs to --finalize'); return 1; }
    const mode: Mode = modes[0] ?? 'update';
    return update({ root: process.cwd(), mode, flags: { verbose: Boolean(flags.verbose), allowDirty: Boolean(flags['allow-dirty']), install, verify: Boolean(flags.verify) } });
  }
  if (command === 'brand') return brandCommand({ root: process.cwd(), flags: brand, allowDirty: Boolean(flags['allow-dirty']) });
  if (command === 'skill') {
    const roots = flags.global ? [os.homedir()] : [process.cwd()];
    for (const r of roots) installSkill(r);
    const skill = path.join(roots[0], '.claude/skills/zz-meridian/SKILL.md');
    console.log(`The zz-meridian skill is in ${flags.global ? path.join(os.homedir(), '.agents/skills') + ' and ' + path.join(os.homedir(), '.claude/skills') : '.agents/skills and .claude/skills'}. Codex may need a restart to list it.`);
    console.log(`To follow it now, read ${skill} and the references beside it: it says how to build what was asked and when it is done.`);
    return 0;
  }
  console.error(`zz-meridian: unknown command "${command}"\n\n${HELP}`);
  return 1;
}

process.exitCode = main();
