import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { adoptSetOf, managedPaths } from '../cli/src/ownership.ts';

describe('card documentation travels with its card', () => {
  const payload = ['src/components/ui/button/index.tsx', 'src/components/ui/button/README.md', 'src/components/ui/button/preview.tsx'];

  it('manages each card README in both routes, and no preview', () => {
    expect(adoptSetOf(payload)).toContain('src/components/ui/button/README.md');
    for (const route of ['adopt', 'create'] as const) {
      const managed = managedPaths(payload, route);
      expect(managed.has('src/components/ui/button/README.md'), route).toBe(true);
      expect(managed.has('src/components/ui/button/preview.tsx'), route).toBe(false);
    }
  });

  it('names no file under docs/ in any card README', () => {
    const offenders: string[] = [];
    for (const layer of fs.readdirSync('src/components', { withFileTypes: true }).filter((d) => d.isDirectory())) {
      for (const card of fs.readdirSync(path.join('src/components', layer.name), { withFileTypes: true }).filter((d) => d.isDirectory())) {
        const readme = path.join('src/components', layer.name, card.name, 'README.md');
        if (fs.existsSync(readme) && /`docs\//.test(fs.readFileSync(readme, 'utf8'))) offenders.push(readme);
      }
    }
    expect(offenders).toEqual([]);
  });
});
