#!/usr/bin/env node
/**
 * zz-meridian: bring ZZ Meridian into a Next.js project, or start a new dashboard on it. The package copies files in
 * and installs the agent skill; nothing in the dashboard depends on it afterwards.
 */
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { adopt } from './adopt.js';
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

const { values, positionals } = parseArgs({
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

const flags = values as Record<string, string | boolean | undefined>;
const brand = Object.fromEntries(BRAND_FLAGS.flatMap((f) => (typeof flags[f] === 'string' ? [[f, flags[f] as string]] : [])));
const install = !values['no-install'];
const [command, arg] = positionals;

function main(): number {
  if (values.version) { console.log(VERSION); return 0; }
  // A brand value is written into TypeScript and JSON; refuse what could end its string before anything is copied.
  const unsafe = Object.entries(brand).find(([, v]) => /[\\\r\n\u2028\u2029]/.test(v));
  if (unsafe) { console.error(`zz-meridian: --${unsafe[0]} may not contain a backslash or a line break`); return 1; }
  if (values.help || !command) { console.log(HELP); return command || values.help ? 0 : 1; }
  if (command === 'adopt') return adopt({ root: process.cwd(), brand, allowDirty: Boolean(values['allow-dirty']), install });
  if (command === 'create') {
    if (!arg) { console.error('zz-meridian create: name the folder for the new dashboard'); return 1; }
    return create({ dir: arg, brand, install });
  }
  if (command === 'update') {
    const modes = (['dry-run', 'resume', 'finalize', 'abort'] as const).filter((m) => values[m]);
    if (modes.length > 1) { console.error(`zz-meridian update: ${modes.map((m) => `--${m}`).join(' and ')} cannot be combined`); return 1; }
    if (values.verify && !values.finalize) { console.error('zz-meridian update: --verify belongs to --finalize'); return 1; }
    const mode: Mode = modes[0] ?? 'update';
    return update({ root: process.cwd(), mode, flags: { verbose: Boolean(values.verbose), allowDirty: Boolean(values['allow-dirty']), install, verify: Boolean(values.verify) } });
  }
  if (command === 'brand') return brandCommand({ root: process.cwd(), flags: brand, allowDirty: Boolean(values['allow-dirty']) });
  if (command === 'skill') {
    const roots = values.global ? [os.homedir()] : [process.cwd()];
    for (const r of roots) installSkill(r);
    console.log(`The zz-meridian skill is in ${values.global ? path.join(os.homedir(), '.agents/skills') + ' and ' + path.join(os.homedir(), '.claude/skills') : '.agents/skills and .claude/skills'}. Codex may need a restart to list it.`);
    return 0;
  }
  console.error(`zz-meridian: unknown command "${command}"\n\n${HELP}`);
  return 1;
}

process.exitCode = main();
