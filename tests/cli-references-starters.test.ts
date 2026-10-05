// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the template's own skills/ folder.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const STARTERS = ['src/data/access.ts', 'src/data/read.ts', 'src/data/live-stream.ts', 'src/data/live-actions.ts', 'app/api/live/route.ts'];
const refs = ['cache.md', 'live.md'].map((f) => fs.readFileSync(path.join(ROOT, 'skills/zz-meridian/references', f), 'utf8')).join('\n');
const blocks = [...refs.matchAll(/```tsx?\n([\s\S]*?)```/g)].map((m) => m[1]);

describe('the cache and live references', () => {
  it('carry every starter verbatim, so the reference compiles because the template does', () => {
    for (const file of STARTERS) expect(blocks.includes(fs.readFileSync(path.join(ROOT, file), 'utf8')), file).toBe(true);
  });
  it('state the demo’s limits and both adapters plainly', () => {
    expect(refs).toMatch(/single process/i);
    expect(refs).toMatch(/LISTEN/);
    expect(refs).toMatch(/NOTIFY/);
    expect(refs).toMatch(/Redis/);
    expect(refs).toMatch(/resync/i);
    expect(refs).toMatch(/polling (cannot|does not) (reconcile|repair)/i);
  });
});
