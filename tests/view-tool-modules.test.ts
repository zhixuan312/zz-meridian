// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { viewToolPages } from '../scripts/lib/routes.ts';

const roots: string[] = [];
afterAll(() => { for (const r of roots) fs.rmSync(r, { recursive: true, force: true }); });

const project = (files: Record<string, string>) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-tools-'));
  roots.push(root);
  for (const [p, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    fs.writeFileSync(path.join(root, p), c);
  }
  return root;
};

const tool = (name: string, page: string) => `export const ${name}Tool = defineViewTool({\n  name: '${name}',\n  page: '${page}',\n  read: async () => ({ page: 'not this' }),\n});\n`;

/**
 * The gate and `ask` find the view tools in every module the registry reaches, not only in `src/views/tools.ts`
 * (issue #43): a project that keeps each tool in a module of its own is read whole, so every page a tool names is held
 * to its agent section.
 */
describe('the view tools the registry reaches', () => {
  it('are read from the registry and from each project module it imports, through an alias, a relative path or an index', () => {
    const root = project({
      'tsconfig.json': '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
      'src/views/tools.ts': `import { z } from 'zod';\nimport { oneTool } from '@/views/tools/one';\nimport { twoTool } from './tools/two.ts';\nimport { more } from './more';\n${tool('home', '/')}export const viewTools = [homeTool, oneTool, twoTool, ...more];\n`,
      'src/views/tools/one.ts': tool('one', '/one'),
      'src/views/tools/two.ts': `import { homeTool } from '../tools';\n${tool('two', '/two/[id]')}`,
      'src/views/more/index.ts': `export { threeTool as more } from './three';\n`,
      'src/views/more/three.ts': tool('three', '/docs/[...path]'),
    });
    expect(viewToolPages(undefined, root)).toEqual([
      { name: 'home', page: '/' },
      { name: 'one', page: '/one' },
      { name: 'two', page: '/two/[id]' },
      { name: 'three', page: '/docs/[...path]' },
    ]);
  });

  it('are none when there is no registry, and the template still finds every tool it lists', () => {
    expect(viewToolPages(undefined, project({ 'package.json': '{}' }))).toBeNull();
    expect(viewToolPages()?.length).toBeGreaterThan(0);
  });
});
