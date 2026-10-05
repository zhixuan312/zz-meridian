/**
 * `zz-meridian create <dir>`: a new dashboard from the template, branded as the person's product (scripts/brand.ts
 * --product removes the Design Atlas, the specifications and the design system's own docs), with the agent skill in
 * the project and every file recorded in the manifest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { managedPaths } from './ownership.js';
import { BRIEF_TEMPLATE, managedBlock, upsertManagedBlock } from './context.js';
import { PAYLOAD, VERSION, brandArgs, effectiveBrand, hasCommand, inside, installSkill, payloadFiles, run, sha256, writeIn, writeManifest } from './files.js';

export type CreateOptions = { dir: string; brand: Record<string, string>; install: boolean };

export function create(o: CreateOptions): number {
  const root = path.resolve(o.dir);
  if (fs.existsSync(root) && fs.readdirSync(root).length) return fail(`${root} exists and is not empty: name a new folder`);

  let brand: Record<string, string>;
  try { brand = effectiveBrand(o.brand); } catch (e) { return fail((e as Error).message); }

  for (const rel of payloadFiles()) {
    if (rel.startsWith('skills/')) continue;
    writeIn(root, rel, fs.readFileSync(path.join(PAYLOAD, rel)));
  }

  const name = brand.name ?? path.basename(root).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  brand = effectiveBrand({ ...brand, name });
  if (run(process.execPath, ['scripts/brand.ts', ...brandArgs(brand), '--product'], root).status !== 0) {
    return fail('scripts/brand.ts failed (above); the template is copied, so fix the cause and run it again with the same flags');
  }

  // pnpm installs from the template's lockfile, with install scripts off (pnpm-workspace.yaml). Without pnpm, corepack
  // (bundled with Node 22) runs it; only without both does npm install, from the version ranges, with scripts off too.
  const install: [string, string[]] = hasCommand('pnpm') ? ['pnpm', ['install']] : hasCommand('corepack') ? ['corepack', ['pnpm', 'install']] : ['npm', ['install', '--ignore-scripts']];
  const pm = install[0] === 'npm' ? 'npm' : 'pnpm';
  if (pm === 'npm') {
    for (const f of ['pnpm-lock.yaml', 'pnpm-workspace.yaml']) fs.rmSync(path.join(root, f), { force: true });
    console.log('pnpm is not available: installing with npm from the version ranges, without a lockfile.');
  }

  // The managed block goes in only now that the installer is known, so its commands match; the template's own lines
  // above `# Working in Meridian` stay. The brief is the template. The manifest walk below records both.
  try {
    writeIn(root, 'AGENTS.md', upsertManagedBlock(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), managedBlock(VERSION, pm)));
  } catch (e) { return fail(`AGENTS.md: ${(e as Error).message}`); }
  writeIn(root, 'docs/brief.md', BRIEF_TEMPLATE);

  const files: Record<string, string> = {};
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(inside(root, rel || '.'), { withFileTypes: true })) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (['node_modules', '.git', '.meridian', '.next'].includes(p)) continue;
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) files[p] = sha256(fs.readFileSync(inside(root, p)));
    }
  };
  walk('');
  // The managed set over what is on disk after branding: the payload rule for the files still there, plus the brand outputs.
  const onDisk = Object.keys(files);
  const managed = managedPaths([...payloadFiles().filter((f) => f.startsWith('skills/') || onDisk.includes(f))], 'create', onDisk);
  for (const rel of onDisk) if (!managed.has(rel)) delete files[rel];
  installSkill(root, files);
  writeManifest(root, { version: VERSION, route: 'create', brand, files });

  if (hasCommand('git')) run('git', ['init', '-q'], root);
  if (o.install && run(install[0], install[1], root).status !== 0) return fail(`${install.join(' ')} failed (above); run it again in ${root}`);

  console.log(`
${name} is a new Meridian ${VERSION} dashboard in ${root}.
  skill: .agents/skills/zz-meridian (Codex) and .claude/skills/zz-meridian (Claude Code)

Next: follow .agents/skills/zz-meridian/SKILL.md from step 5 (the template is fetched and branded): data first, then
the pages, then ${pm} run verify until it passes.`);
  return 0;
}

function fail(msg: string): number {
  console.error(`zz-meridian create: ${msg}`);
  return 1;
}
