// @vitest-environment node
// Named cli-* so the payload leaves it out: it is the record of the alerts module's move from src/data to src/logic.
// The rule a project keeps, that the data layer imports neither layer above it, is `scripts/check.ts`'s.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const walk = (dir: string, out: string[] = []): string[] => {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
};
const source = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('the alerts module', () => {
  it('lives in the logic layer', async () => {
    const mod = await import('@/logic/alerts');
    expect(typeof mod.readAlerts).toBe('function');
  });

  it('has left the data layer', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/data/alerts.ts'))).toBe(false);
  });

  it('leaves no data module importing the logic layer above it', () => {
    const reaching = walk('src/data')
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => /from\s+['"]@\/logic\//.test(source(f)));
    expect(reaching).toEqual([]);
  });

  const GUIDES = ['skills/zz-meridian/SKILL.md', 'skills/zz-meridian/references/customize.md', 'skills/zz-meridian/references/existing-project.md', 'docs/start-a-dashboard.md', 'src/components/patterns/shell-tools/README.md'];
  it('is named by the guides at its new path', () => {
    for (const doc of GUIDES) {
      expect(source(doc), doc).toContain('src/logic/alerts.ts');
      expect(source(doc), doc).not.toContain('src/data/alerts.ts');
    }
  });
});
