// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the skill and the guides, which a product does not keep.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const REFERENCES = fs.readdirSync(path.join(ROOT, 'skills/zz-meridian/references')).filter((f) => f.endsWith('.md')).map((f) => `skills/zz-meridian/references/${f}`);
const GUIDES = ['skills/zz-meridian/SKILL.md', ...REFERENCES, 'docs/start-a-dashboard.md'];
const customize = read('skills/zz-meridian/references/customize.md');
/** Whether `file` exports `name`, as a function, a constant or a type. */
const exported = (file: string, name: string) => new RegExp(`export (?:async )?(?:function|const|type) ${name}\\b`).test(read(file));

describe('the guides, held to what was delivered', () => {
  it('say nothing of a typed list of alerts: the sample exports none, and the layout reads its alerts', () => {
    expect(read('src/data/sample.ts')).not.toMatch(/\bALERTS\b/);
    expect(read('app/(dashboard)/layout.tsx')).toMatch(/readAlerts\(\)/);
    for (const guide of GUIDES) expect(read(guide), guide).not.toMatch(/`ALERTS`/);
  });

  it('describe the dashboard layout the tree has: it hands the bell a read, and imports neither a clock nor the tools', () => {
    const layout = read('app/(dashboard)/layout.tsx');
    expect(layout).toMatch(/<ShellAlerts\b/);
    expect(layout).not.toMatch(/\bDEMO_NOW\b|<ShellTools\b/);
    // No guide says the layout imports, holds or passes what it no longer does.
    for (const guide of GUIDES) expect(read(guide), guide).not.toMatch(/layout(?:'s| imports| passes)\s+`(?:DEMO_NOW|ShellTools)`/);
    expect(read('skills/zz-meridian/references/existing-project.md')).toMatch(/\bShellAlerts\b/);
  });

  it('name the read a product writes for its own alerts', () => {
    expect(exported('src/data/alerts.ts', 'readAlerts')).toBe(true);
    expect(customize).toMatch(/\breadAlerts\b/);
    expect(customize).toContain('src/data/alerts.ts');
  });

  it('name the records template and its loading arrangement by the names the code exports, and where they live', () => {
    for (const name of ['Records', 'RecordsSkeleton']) {
      expect(exported('src/components/templates/records/index.tsx', name), name).toBe(true);
      expect(customize, name).toMatch(new RegExp(`\\b${name}\\b`));
    }
    expect(customize).toContain('src/components/templates/records');
    expect(exported('src/components/patterns/page-loading/index.tsx', 'LoadingPage')).toBe(true);
    expect(customize).toMatch(/\bLoadingPage\b/);
    expect(customize).toContain('src/components/patterns/page-loading');
  });

  it('say how a product declares workspaces, and that one navigation needs none', () => {
    expect(exported('src/app.config.ts', 'workspaces')).toBe(true);
    for (const name of ['workspaceOf', 'navOf']) expect(exported('src/views/workspaces.ts', name), name).toBe(true);
    for (const word of ['workspaces', 'homeHref', 'audience', 'src/views/workspaces.ts', 'src/views/workspace-chrome.tsx']) expect(customize, word).toContain(word);
    // The address alone decides the workspace: the guide says so, in words it did not hold before this was written.
    expect(customize).toMatch(/address\s+alone/);
    // A product with one navigation draws the console chrome as it is.
    expect(customize).toMatch(/\bConsoleRail\b/);
  });

  it('name the leave guard a form reports to', () => {
    for (const name of ['useUnsavedChanges', 'useLeave']) {
      expect(exported('src/components/base/shell/index.tsx', name), name).toBe(true);
      expect(customize, name).toMatch(new RegExp(`\\b${name}\\b`));
    }
  });

  it('call the page at /health by its name, Operations', () => {
    expect(customize).not.toMatch(/The health preset/);
    expect(customize).toMatch(/Operations/);
  });

  it('say what the sample does not do, where a product would otherwise copy a promise', () => {
    // Writes are held in memory, and the figures that do not follow the period are fixed: the two limits a copied page inherits.
    expect(customize).toMatch(/in\s+memory/);
    expect(customize).toMatch(/fixed\s+figures?|figures\s+(?:that\s+are\s+)?fixed/);
  });
});
