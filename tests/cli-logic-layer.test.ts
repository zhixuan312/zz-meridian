// @vitest-environment node
// Named cli-* so the payload leaves it out: it is the record that the sample's producers moved into src/logic, and it
// names the sample's modules. What a project keeps of it, the four-layer rules, `scripts/check.ts` holds wherever
// `scripts/check.local.ts` turns them on.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { walk as walkTree } from '../scripts/lib/layer-rules.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const walk = (dir: string) => walkTree(ROOT, dir, /./);
const source = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
// The 35 producers are 4 *-parts.ts, 14 *-context.ts, 14 *-explore.ts, plus tools.ts, fact-insight.ts and main-summary.ts.
const isProducer = (f: string) => /-(parts|context|explore)\.ts$/.test(f) || /\/(tools|fact-insight|main-summary)\.ts$/.test(f);

const NAMED = ['tools.ts', 'fact-insight.ts', 'main-summary.ts', 'key-scopes.ts', 'summarise.ts', 'after-start.ts'];

describe('the logic layer', () => {
  it('holds the 35 producers that used to live in src/views', () => {
    expect(walk('src/logic').filter(isProducer).length).toBeGreaterThanOrEqual(35);
  });

  it('holds the modules the moved producers import by value', () => {
    const logic = walk('src/logic');
    for (const name of NAMED) expect(logic, name).toContain(`src/logic/${name}`);
  });

  it('leaves nothing under src/views that produces a figure, a sentence or a prepared query', () => {
    const left = walk('src/views').filter((f) => isProducer(f) || /\/(tools|fact-insight|main-summary|key-scopes)\.ts$/.test(f));
    expect(left).toEqual([]);
    expect(walk('src/views')).toContain('src/views/workspaces.ts');
  });

  it('never reaches up into the views it sits above', () => {
    const reaching = walk('src/logic')
      .filter((f) => /\.tsx?$/.test(f))
      .filter((f) => /from\s+['"]@\/views|from\s+['"]\.\.\/views/.test(source(f)));
    expect(reaching).toEqual([]);
  });

  it('owns the four pure helpers as functions', async () => {
    const summarise = await import('@/logic/summarise');
    for (const name of ['summarise', 'packServices', 'unpackServices']) expect(typeof summarise[name as keyof typeof summarise], name).toBe('function');
    const afterStart = await import('@/logic/after-start');
    expect(typeof afterStart.afterStart).toBe('function');
  });

  it('does not keep a second copy of a helper in a card folder', () => {
    expect(source('src/components/patterns/status-list/index.tsx')).not.toContain('export { summarise }');
  });
});
