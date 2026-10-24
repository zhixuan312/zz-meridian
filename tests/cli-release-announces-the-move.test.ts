// @vitest-environment node
// The release that moves thirty-eight modules says so once, in the two places an adopter looks — the changelog and the
// migration `update` prints — and both say the same thing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { RELEASE_MIGRATIONS } from '../cli/src/migrations.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
const newest = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m)![1];
/** Every module the move relocated, as the path it left and the path it went to. */
const MOVED: [from: string, to: string][] = [
  ['src/data/alerts.ts', 'src/logic/alerts.ts'],
  ['src/components/patterns/status-list/summarise.ts', 'src/logic/summarise.ts'],
  ...['customer-context', 'customer-explore', 'customers-context', 'customers-explore', 'fact-insight',
    'home-context', 'home-explore', 'home-parts', 'key-scopes', 'keys-context', 'keys-explore', 'main-summary',
    'members-context', 'members-explore', 'now-context', 'now-explore', 'now-parts', 'releases-context',
    'releases-explore', 'request-context', 'request-explore', 'requests-context', 'requests-explore',
    'revenue-context', 'revenue-explore', 'revenue-parts', 'services-context', 'services-explore',
    'tests-context', 'tests-explore', 'tickets-context', 'tickets-explore', 'tools', 'usage-context',
    'usage-explore', 'usage-parts',
  ].map((name): [string, string] => [`src/views/${name}.ts`, `src/logic/${name}.ts`]),
];
const entry = RELEASE_MIGRATIONS.find((m) => m.since === newest);

const tmp: string[] = [];
afterAll(() => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });

/** A project with one file of its own that imports from the paths the move left behind. */
function project(source: string | null): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-move-'));
  tmp.push(root);
  if (source !== null) {
    fs.mkdirSync(path.join(root, 'app'), { recursive: true });
    fs.writeFileSync(path.join(root, 'app', 'page.tsx'), source);
  }
  return root;
}

describe('the release that moved the logic layer', () => {
  it('has a migration for it, and the changelog section it belongs to', () => {
    expect(entry, `a migration with since ${newest}`).toBeDefined();
    // The newest release's own section: from its heading to the next release heading, which is the only `\n## [` after it.
    const start = changelog.indexOf('## [');
    const next = changelog.indexOf('\n## [', start + 1);
    const section = changelog.slice(start, next === -1 ? undefined : next);
    expect(section, 'the newest section says what moved').toContain('src/logic/');
    expect(section, 'announces it as a break').toMatch(/^### Breaking$/m);
    // AC-4.3's own command reads the changelog's first 4000 characters, so the section has to carry the link itself.
    expect(changelog.slice(0, 4000), 'named within AC-4.3\'s window').toContain('data-layers.md');
    // docs/testing.md: a red left at a release is the owner's decision, named here as a known issue with where it is fixed.
    // 0.28.0 leaves none — the first-load red this section used to carry is fixed — so the section states that instead, and
    // a known-issues section coming back would be a red coming back, which this refuses by name.
    expect(section, 'a section on what was fixed').toMatch(/^### Fixed$/m);
    expect(section.slice(section.indexOf('### Fixed')), 'naming the red it fixed').toMatch(/first.load/i);
    expect(section, 'a known issue it does not carry').not.toMatch(/^### Known issues$/m);
    // The two sentences the AC asks the section to carry: what a team does, and what happens if it does nothing.
    expect(section, 'what a team does').toMatch(/rewrite|move|change/i);
    expect(section, 'what happens if it does nothing').toMatch(/doing nothing|do nothing/i);
    expect(section, 'and where to read it').toContain('four-layers');
  });

  it('is listed in the consumer smoke, which resolves only the ids it names', () => {
    const smoke = fs.readFileSync(path.join(ROOT, 'cli/scripts/smoke.ts'), 'utf8');
    const listed = /^const RELEASE_IDS = \[([^\]]*)\];$/m.exec(smoke)?.[1] ?? '';
    expect(listed).toContain('four-layers');
  });

  it('names every module that moved, with the path it left', () => {
    expect(MOVED).toHaveLength(38);
    for (const [from, to] of MOVED) {
      expect(entry!.instructions, to).toContain(to);
      expect(entry!.instructions, from).toContain(from);
    }
  });

  it('applies to a project that imports an old path, and to none that does not', () => {
    const old = project("import { homeContext } from '@/views/home-context';\nexport default homeContext;\n");
    const moved = project("import { alerts } from '@/data/alerts';\nexport default alerts;\n");
    const own = project("import { readAll } from '@/data/read';\nexport default readAll;\n");
    const none = project(null);
    // Not `not.toBeNull()`: an empty list is truthy, and a migration that reports no paths is one that names nothing to do.
    for (const root of [old, moved]) expect(entry!.applies(root), root).toContain('app/page.tsx');
    for (const root of [own, none]) expect(entry!.applies(root), root).toBeNull();
  });

  it('is named on the npm page, which is the surface an adopter who never opens this repository reads', () => {
    expect(fs.readFileSync(path.join(ROOT, 'cli/README.md'), 'utf8')).toContain('data-layers.md');
  });
});
