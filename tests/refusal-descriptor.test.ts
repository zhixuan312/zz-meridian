// @vitest-environment node
// The data layer returns reasons; the views draw them. Neither may borrow the other's job.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const source = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const pages = (dir: string, out: string[] = []): string[] => {
  const abs = path.join(ROOT, dir);
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) pages(rel, out);
    else if (entry.name === 'page.tsx') out.push(rel);
  }
  return out;
};

describe('the refusal descriptor', () => {
  it('keeps the data layer out of the views and out of JSX', () => {
    const access = source('src/data/access.ts');
    expect(access).not.toContain("from '@/views");
    expect(access).not.toContain('createElement');
    expect(access).not.toContain('JSX.Element');
  });

  it('still exports the gate a page calls', async () => {
    const mod = await import('@/data/access');
    expect(typeof mod.gate).toBe('function');
    expect(typeof mod.gatedMetadata).toBe('function');
  });

  it('draws a refusal in the views', () => {
    const refusal = source('src/views/refusal.tsx');
    expect(refusal).toMatch(/MissingPage|NoAccess/);
  });

  it('passes every gated page through the renderer', () => {
    const gated = pages('app').filter((p) => /from '@\/data\/access'/.test(source(p)) && /\bgate\(/.test(source(p)));
    expect(gated.length).toBeGreaterThan(0);
    const missing = gated.filter((p) => !/from '@\/views\/refusal'/.test(source(p)));
    expect(missing).toEqual([]);
  });
});
