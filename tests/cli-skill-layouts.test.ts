// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the template's own skills/ folder, which a product does not have.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { adoptSetOf } from '../cli/src/ownership.ts';
import { scanReferences } from '../scripts/lib/context-check.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const walk = (dir: string): string[] => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.md') ? [`${dir}/${e.name}`] : []));
const scripts = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts));
/** A created project's scripts: `brand --product` takes the registry's away with the registry. */
const createdScripts = new Set([...scripts].filter((s) => s !== 'registry'));

const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
/** Whether a set of files holds a path, as a file or as a folder with something in it. */
const holds = (files: ReadonlySet<string>) => (p: string) => { const q = p.replace(/\/$/, ''); return files.has(q) || [...files].some((f) => f.startsWith(`${q}/`)); };
/** The skill as a project holds it: both trees, at the paths its own `references/` links resolve from. */
const installed = walk('skills/zz-meridian').map((file) => ({ file: `.agents/${file}`, text: fs.readFileSync(path.join(ROOT, file), 'utf8') }));
const skillTrees = tracked.filter((f) => f.startsWith('skills/zz-meridian/')).flatMap((f) => [`.agents/${f}`, `.claude/${f}`]);
const brand = fs.readFileSync(path.join(ROOT, 'scripts/brand.ts'), 'utf8');
const atlasOnly = [...(/const atlasOnly = \[([^\]]*)\]/.exec(brand)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => `src/system/${m[1]}`);

// A project's own `check.ts` reads the installed skill and fails its gate on a path the project does not have, unless
// the skill wrote it `optional:` or `example:`. The template has every file, so only these two cases can see a path
// that needs the prefix.
describe('the skill in a project made by create', () => {
  it('names no required path that create leaves out', () => {
    expect(atlasOnly).toContain('src/system/content.ts');
    // The template's tracked files, less what `brand --product --no-atlas` removes, with the brief and the two skill trees.
    const productOnly = ['src/system/specimen.tsx', 'src/system/registry.ts'];
    for (const f of productOnly) expect(brand, f).toContain(`'${f}'`);
    const created = new Set([
      ...tracked.filter((f) => !/^(app\/system|docs|decisions|skills|cli|\.github)\//.test(f) && !atlasOnly.includes(f) && !productOnly.includes(f) && !/^(CONTRIBUTING|CHANGELOG)\.md$/.test(f)
        && !/^src\/components\/.*\/(README\.md|preview\.tsx)$/.test(f) && !/^app\/.*README\.md$/.test(f)),
      'docs/brief.md', '.meridian/manifest.json', ...skillTrees,
    ]);
    expect(scanReferences(installed, holds(created), createdScripts)).toEqual([]);
  });
});

describe('the skill in a project made by adopt', () => {
  it('names no required path that adopt does not give', () => {
    // What adopt copies, what it writes for the project, the two skill trees, and the team's own `app/`.
    const adopted = new Set([...adoptSetOf(tracked), 'src/app.config.ts', 'scripts/verify.config.ts', 'docs/brief.md', 'AGENTS.md', '.meridian/manifest.json', 'app/layout.tsx', ...skillTrees]);
    expect(adopted.has('src/lib/collection.ts')).toBe(true);
    expect(adopted.has('src/data/access.ts')).toBe(false);
    expect(scanReferences(installed, holds(adopted), scripts)).toEqual([]);
  });
});

describe('the skill in a project created by an earlier release', () => {
  it('names no required path that such a project lacks', () => {
    // A product created with `brand.ts --product` has no docs/ or decisions/; one created before 0.5.0 has no brief either.
    const exists = (p: string) => !/^(docs|decisions)(\/|$)/.test(p) && fs.existsSync(path.join(ROOT, p));
    const docs = walk('skills/zz-meridian').map((file) => ({ file, text: fs.readFileSync(path.join(ROOT, file), 'utf8') }));
    expect(scanReferences(docs, exists, scripts)).toEqual([]);
  });
});
