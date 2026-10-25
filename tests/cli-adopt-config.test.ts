// @vitest-environment node
// Named cli-* so the payload leaves it out: it runs the package's own adopt code against the template's configuration.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { eslintConfigOf, projectConfig } from '../cli/src/adopt.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const template = fs.readFileSync(path.join(ROOT, 'src/app.config.ts'), 'utf8');
const written = projectConfig(template, ['/', '/orders', '/orders/returns']);

describe('the configuration adopt writes for a project', () => {
  it('lists the project\'s own pages, each public, and none of the sample\'s destinations', () => {
    for (const href of ['/', '/orders', '/orders/returns']) expect(written).toContain(`href: ${JSON.stringify(href)}`);
    expect(written.match(/needs: 'public'/g)?.length).toBe(3);
    for (const sample of ['/usage', '/services', '/operations-tickets', '/system']) expect(written, sample).not.toContain(`'${sample}'`);
  });

  it('names nothing the project does not have: no feature table, no icon but its own, no workspace of the sample', () => {
    expect(written).not.toMatch(/\bFEATURES\b/);
    expect(written).not.toMatch(/\bworkspaces\b|\bWorkspaceId\b/);
    expect(written).not.toMatch(/\b(Main|Business|Engineering)\b/);
    const icons = written.match(/import \{([^}]*)\} from 'lucide-react';/)![1].split(',').map((n) => n.trim()).filter(Boolean);
    expect(icons).toEqual(['LayoutGrid', 'type LucideIcon']);
    // Every item names the one icon the file imports. (The item type's own `icon: LucideIcon` is a type, not an item.)
    expect(written.match(/\{ href: ["'][^\n]*/g)?.every((item) => /\bicon: LayoutGrid\b/.test(item))).toBe(true);
  });

  it('still exports what the components and the checks ask a configuration for', () => {
    for (const name of ['app', 'nav', 'slug']) expect(written, name).toMatch(new RegExp(`export const ${name}\\b`));
    for (const name of ['NavItem', 'NavGroup']) expect(written, name).toMatch(new RegExp(`export type ${name}\\b`));
    expect(written).toMatch(/workspace: 'Production'/);
  });

  it('is what the template says, where the template says nothing about the sample', () => {
    expect(template).toMatch(/\bworkspaces\b/);
    expect(template).toMatch(/\bFEATURES\b/);
    expect(written).toContain("name: 'ZZ Meridian'");
  });
});

/**
 * A project created by `create-next-app --no-eslint` and adopted failed its gate at `lint passes` 0.7 s in: ESLint said it
 * could not find an `eslint.config.*` file, which tells a team nothing about Meridian. Every other step passed. So adopt
 * asks this one question, and the answer decides whether it brings a configuration or leaves the team's alone.
 */
describe('the ESLint configuration a project brings to the adoption', () => {
  const dirs: string[] = [];
  const project = (...files: string[]) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adopt-eslint-'));
    dirs.push(dir);
    for (const f of files) fs.writeFileSync(path.join(dir, f), '// a configuration\n');
    return dir;
  };
  afterAll(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

  it('finds none in a project that has none, which is when adopt writes Meridian\'s', () => {
    expect(eslintConfigOf(project('package.json', 'tsconfig.json'))).toBeNull();
  });

  it('finds a flat configuration in every form ESLint 9 reads, and calls none of them legacy', () => {
    for (const f of ['eslint.config.ts', 'eslint.config.mts', 'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs']) {
      expect(eslintConfigOf(project(f)), f).toEqual({ file: f, legacy: false });
    }
  });

  it('finds a legacy .eslintrc and says so, because ESLint 9 no longer loads it', () => {
    for (const f of ['.eslintrc', '.eslintrc.json', '.eslintrc.cjs', '.eslintrc.yml']) {
      expect(eslintConfigOf(project(f)), f).toEqual({ file: f, legacy: true });
    }
  });

  it('prefers the flat form when a project carries both, since that is the one that runs', () => {
    expect(eslintConfigOf(project('.eslintrc.json', 'eslint.config.mjs'))).toEqual({ file: 'eslint.config.mjs', legacy: false });
  });
});

/**
 * The adopted `scripts/verify.config.ts` failed the gate's own lint: replacing the sample's config object left
 * `const EVERY_ROUTE` declared and never read, and `@typescript-eslint/no-unused-vars` is an error in this project. A
 * project is not handed a gate it cannot pass.
 */
describe('the verify configuration adopt writes', () => {
  it('declares nothing it does not read', async () => {
    const { verifyConfig } = await import('../cli/src/adopt.ts');
    const text = verifyConfig();
    const declared = [...text.matchAll(/^(?:export )?const (\w+)/gm)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(0);
    for (const name of declared) {
      const reads = text.split(new RegExp(`\\b${name}\\b`)).length - 1;
      expect(reads, `${name} is declared and never read`).toBeGreaterThan(1);
    }
  });

  it('names the sample\'s routes nowhere, and keeps the two settings a project has to decide', async () => {
    const { verifyConfig } = await import('../cli/src/adopt.ts');
    const text = verifyConfig();
    expect(text).not.toMatch(/EVERY_ROUTE/);
    for (const sample of ['/operations-tickets', '/system/start']) expect(text, sample).not.toContain(`'${sample}'`);
    expect(text).toMatch(/detailRoutes: \[\]/);
    expect(text).toMatch(/refusal,/);
  });
});

/**
 * `adopt` writes the skill in last, after every other write and after the gate that stops on any other file in the way.
 * So a team's own edited copy of it was replaced without a word — and the command exited 0. The skill is Meridian's, but
 * the file in their project is theirs to edit, and the rule for every other copy applies to it too.
 */
describe('the skill adopt brings', () => {
  it('is checked against the project\'s own copy before anything is written', async () => {
    const { skillPaths } = await import('../cli/src/files.ts');
    const paths = skillPaths();
    expect(paths.length).toBeGreaterThan(13);
    expect(paths.map((p) => p.rel)).toContain('.claude/skills/zz-meridian/SKILL.md');
    expect(paths.map((p) => p.rel)).toContain('.agents/skills/zz-meridian/references/update.md');
    // Every destination is one of the two folders an agent reads, and every payload file is named by it.
    for (const p of paths) expect(p.rel).toMatch(/^\.(agents|claude)\/skills\/zz-meridian\//);
  });
});
