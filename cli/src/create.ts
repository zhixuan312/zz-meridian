/**
 * `zz-meridian create <dir>`: a new dashboard from the template, branded as the person's product (scripts/brand.ts
 * --product removes the Design Atlas, the specifications and the design system's own docs), with the agent skill in
 * the project and every file recorded in the manifest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PAYLOAD, VERSION, brandArgs, hasCommand, inside, installSkill, payloadFiles, run, sha256, writeIn, writeManifest } from './files.js';

export type CreateOptions = { dir: string; brand: Record<string, string>; install: boolean };

export function create(o: CreateOptions): number {
  const root = path.resolve(o.dir);
  if (fs.existsSync(root) && fs.readdirSync(root).length) return fail(`${root} exists and is not empty: name a new folder`);

  for (const rel of payloadFiles()) {
    if (rel.startsWith('skills/')) continue;
    writeIn(root, rel, fs.readFileSync(path.join(PAYLOAD, rel)));
  }

  const name = o.brand.name ?? path.basename(root).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const brand = { ...o.brand, name };
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
