import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { aliasesOf, importTarget } from '../scripts/lib/aliases.ts';

describe('the import aliases the checks resolve', () => {
  it('resolves JSONC in a standalone Node process without installed packages', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-aliases-'));
    try {
      fs.cpSync(path.resolve(import.meta.dirname, '../scripts/lib'), path.join(dir, 'lib'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
      const config = '\uFEFF{"compilerOptions":{"baseUrl":"./code",/* old path */"paths":{"@/*":["./live/*"],},},}';
      const run = spawnSync(process.execPath, ['--input-type=module', '--eval', `import { aliasesOf } from './lib/aliases.ts'; console.log(JSON.stringify(aliasesOf(${JSON.stringify(config)})))`], { cwd: dir, encoding: 'utf8' });
      expect(run.status, run.stderr).toBe(0);
      expect(JSON.parse(run.stdout)).toContainEqual(['@/', 'code/live/']);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('refuses unterminated comments and never joins tokens across a comment', () => {
    expect(() => aliasesOf('{"compilerOptions":{}} /* unfinished')).toThrow();
    expect(() => aliasesOf('{"compilerOptions":{},"x":tru/* gap */e}')).toThrow();
  });
  it('ignores commented paths and resolves live paths against baseUrl', () => {
    const a = aliasesOf(`{
      "compilerOptions": {
        "baseUrl": "./app-code",
        // "paths": { "@/*": ["./retired/*"] },
        "paths": { "@/*": ["./live/*"], "@meridian/*": ["../src/*"], },
      },
    }`);
    expect(importTarget('app/page.tsx', '@/orders', a)).toBe('app-code/live/orders');
    expect(importTarget('app/page.tsx', '@meridian/lib/format', a)).toBe('src/lib/format');
  });

  it('does not turn a commented-out alias into a live path', () => {
    const a = aliasesOf('{ "compilerOptions": { /* "paths": { "@/*": ["./old/*"] } */ } }');
    expect(importTarget('app/page.tsx', '@/orders', a)).toBe('src/orders');
  });

  it("are the template's: @/ is src/", () => {
    const a = aliasesOf('{ "compilerOptions": { "paths": {\n  "@/*": [\n    "./src/*"\n  ]\n} } }');
    expect(importTarget('app/page.tsx', '@/data/orders', a)).toBe('src/data/orders');
  });
  it("are an adopted project's: @/ is the team's root and @meridian/ is src/", () => {
    const a = aliasesOf('{ "compilerOptions": { "paths": { "@/*": ["./*"], "@meridian/*": ["./src/*"] } } }');
    expect(importTarget('app/page.tsx', '@meridian/components/ui/button', a)).toBe('src/components/ui/button');
    expect(importTarget('app/page.tsx', '@/lib/api', a)).toBe('lib/api');
  });
  it('fall back to @/ as src/ without paths, and leave packages alone', () => {
    const a = aliasesOf(null);
    expect(importTarget('src/views/x.tsx', '@/lib/format', a)).toBe('src/lib/format');
    expect(importTarget('src/views/x.tsx', './y', a)).toBe('src/views/y');
    expect(importTarget('src/views/x.tsx', 'react', a)).toBeNull();
  });
});
