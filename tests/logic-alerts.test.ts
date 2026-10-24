// @vitest-environment node
// The data layer may not import the layer above it: the alerts module was the last one that did.
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

  // Only the logic half: `src/data/access.ts` imports `@/views` too, and it is Task I-3's, in this same wave. The
  // whole rule is Task I-4's `data imports neither`, which lands after both moves.
  it('leaves no data module importing the logic layer above it', () => {
    const reaching = walk('src/data')
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => /from\s+['"]@\/logic\//.test(source(f)));
    expect(reaching).toEqual([]);
  });

  it('is named by the guides at its new path', () => {
    for (const doc of ['skills/zz-meridian/SKILL.md', 'skills/zz-meridian/references/customize.md', 'skills/zz-meridian/references/existing-project.md', 'docs/start-a-dashboard.md', 'src/components/patterns/shell-tools/README.md']) {
      expect(source(doc), doc).toContain('src/logic/alerts.ts');
      expect(source(doc), doc).not.toContain('src/data/alerts.ts');
    }
  });
});
