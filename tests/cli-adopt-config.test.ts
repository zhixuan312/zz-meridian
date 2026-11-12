// @vitest-environment node
// Named cli-* so the payload leaves it out: it runs the package's own adopt code against the template's configuration.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { eslintConfigOf, existingFile, projectConfig, stylesheetPath } from '../cli/src/adopt.ts';
import { installSkill, payloadBytes, skillPaths } from '../cli/src/files.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const template = fs.readFileSync(path.join(ROOT, 'src/app.config.ts'), 'utf8');
const written = projectConfig(template, ['/', '/orders', '/orders/returns']);

describe('the configuration adopt writes for a project', () => {
  it('lists the project\'s own pages, each public, and none of the sample\'s destinations', () => {
    for (const href of ['/', '/orders', '/orders/returns']) expect(written).toContain(`href: ${JSON.stringify(href)}`);
    expect(written.match(/needs: 'public'/g)?.length).toBe(3);
    for (const sample of ['/usage', '/services', '/operations-tickets', '/system']) expect(written, sample).not.toContain(`'${sample}'`);
  });

  it('leaves out the sample feature and workspace tables', () => {
    expect(written).not.toMatch(/\bFEATURES\b/);
    expect(written).not.toMatch(/\bworkspaces\b|\bWorkspaceId\b/);
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
 * `adopt` writes the skill in last, after every other write and after the gate that stops on any other file in the way.
 * So a team's own edited copy of it was replaced without a word — and the command exited 0. The skill is Meridian's, but
 * the file in their project is theirs to edit, and the rule for every other copy applies to it too.
 */
describe('the skill adopt brings', () => {
  const dirs: string[] = [];
  const project = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'install-skill-'));
    dirs.push(dir);
    return dir;
  };
  const put = (root: string, rel: string, content: string | Buffer) => {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
    return abs;
  };
  afterAll(() => { for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true }); });

  it.each(['folder', 'entry point'] as const)('refuses a missing packaged skill %s before touching either destination', (missing) => {
    const root = project();
    const pkg = project();
    put(pkg, 'package.json', JSON.stringify({ type: 'module', version: '0.0.0' }));
    put(pkg, 'src/files.ts', fs.readFileSync(path.join(ROOT, 'cli/src/files.ts')));
    put(pkg, 'src/jsonc.ts', fs.readFileSync(path.join(ROOT, 'cli/src/jsonc.ts')));
    put(pkg, 'payload/other.txt', 'unrelated payload');
    if (missing === 'entry point') put(pkg, 'payload/skills/zz-meridian/references/note.md', 'Reference without a skill entry point.');
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import { installSkill } from ${JSON.stringify(pathToFileURL(path.join(pkg, 'src/files.ts')).href)}; installSkill(${JSON.stringify(root)});`], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SKILL.md');
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it('preserves a custom Claude skill and leaves the earlier absent agent target absent', () => {
    const root = project();
    const rel = '.claude/skills/zz-meridian/SKILL.md';
    const sentinel = 'Custom instructions that must survive.\n';
    const custom = put(root, rel, sentinel);
    const record = { existing: 'unchanged' };

    expect(() => installSkill(root, record)).toThrow(`refusing to overwrite ${rel}`);
    expect(fs.readFileSync(custom, 'utf8')).toBe(sentinel);
    expect(fs.existsSync(path.join(root, '.agents'))).toBe(false);
    expect(fs.readdirSync(path.dirname(custom))).toEqual(['SKILL.md']);
    expect(record).toEqual({ existing: 'unchanged' });
  });

  it('preflights reference files too, before either target is written', () => {
    const root = project();
    const reference = skillPaths().find(({ rel }) => rel.startsWith('.claude/') && rel.includes('/references/'))!;
    const custom = put(root, reference.rel, 'Custom reference.\n');

    expect(() => installSkill(root)).toThrow(`refusing to overwrite ${reference.rel}`);
    expect(fs.readFileSync(custom, 'utf8')).toBe('Custom reference.\n');
    expect(fs.existsSync(path.join(root, '.agents'))).toBe(false);
    expect(fs.existsSync(path.join(root, '.claude/skills/zz-meridian/SKILL.md'))).toBe(false);
  });

  it('retains installed skill ownership in manifest records on an identical reinstall', () => {
    const root = project();
    installSkill(root);
    const record: Record<string, string> = {};
    installSkill(root, record);
    for (const { rel } of skillPaths()) {
      const content = fs.readFileSync(path.join(root, rel));
      expect(record[rel]).toBe(`sha256-${createHash('sha256').update(content).digest('hex')}`);
    }
  });

  it.each(['folder', 'file'] as const)('refuses a late %s symlink without changing either target or its destination', (kind) => {
    const root = project();
    const outside = project();
    const rel = '.claude/skills/zz-meridian/SKILL.md';
    const payload = skillPaths().find((entry) => entry.rel === rel)!.payload;
    // Even identical external bytes cannot authorize following a link into someone else's instructions.
    const external = put(outside, 'SKILL.md', payloadBytes(payload));
    const linked = path.join(root, kind === 'folder' ? '.claude/skills/zz-meridian' : rel);
    fs.mkdirSync(path.dirname(linked), { recursive: true });
    fs.symlinkSync(kind === 'folder' ? outside : external, linked);

    expect(() => installSkill(root)).toThrow('symbolic link');
    expect(fs.existsSync(path.join(root, '.agents'))).toBe(false);
    expect(fs.lstatSync(linked).isSymbolicLink()).toBe(true);
    expect(fs.readdirSync(outside)).toEqual(['SKILL.md']);
    expect(fs.readFileSync(external)).toEqual(payloadBytes(payload));
  });
});

describe("the stylesheet the root layout imports", () => {
  const tsconfig = JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['./src/*'] } } });
  it("is found by its relative path, by the project's own alias, or as the default when none is imported", () => {
    expect(stylesheetPath('app/layout.tsx', "import './globals.css';", null, 'app')).toEqual({ rel: 'app/globals.css', spec: './globals.css' });
    expect(stylesheetPath('app/layout.tsx', "import '@/styles/globals.css';", tsconfig, 'app')).toEqual({ rel: 'src/styles/globals.css', spec: '@/styles/globals.css' });
    expect(stylesheetPath('src/app/layout.tsx', 'export default function L() { return null; }', null, 'src/app')).toEqual({ rel: 'src/app/globals.css' });
  });

  it('is refused rather than replaced when the import cannot be resolved, so the team sheet stays active', () => {
    expect(stylesheetPath('app/layout.tsx', "import '~/styles/globals.css';", tsconfig, 'app')).toEqual({ unresolved: '~/styles/globals.css' });
  });
});

describe('a path adopt is about to copy to', () => {
  const dirs: string[] = [];
  afterAll(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));
  const tmp = (name: string) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-adopt-existing-')); dirs.push(d); return path.join(d, name); };
  it('is absent, the packaged bytes, or a conflict — never read when it is not a regular file', () => {
    const file = tmp('button.tsx');
    expect(existingFile(file, 'A')).toBe('absent');
    fs.writeFileSync(file, 'A');
    expect(existingFile(file, 'A')).toBe('same');
    expect(existingFile(file, 'B')).toBe('conflict');
  });
  it('treats a directory and a symbolic link as conflicts, whatever they point at', () => {
    const dir = tmp('folder');
    fs.mkdirSync(dir);
    expect(existingFile(dir, 'A')).toBe('conflict');
    const target = tmp('target.tsx');
    fs.writeFileSync(target, 'A');
    const link = tmp('link.tsx');
    fs.symlinkSync(target, link);
    expect(existingFile(link, 'A')).toBe('conflict');
  });
});
