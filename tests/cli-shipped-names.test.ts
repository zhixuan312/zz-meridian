// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { projectPath, shippedPath } from '../cli/src/files.ts';
import { payloadList } from '../cli/src/replay.ts';

const tmp: string[] = [];
afterEach(() => { for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });

// npm renames a `.gitignore` inside an installed package to `.npmignore`, so the payload carries it as `gitignore`.
describe('the names a payload file ships under', () => {
  it('ships .gitignore as gitignore, and every other path as itself', () => {
    expect(shippedPath('.gitignore')).toBe('gitignore');
    expect(shippedPath('src/lib/cn.ts')).toBe('src/lib/cn.ts');
  });
  it('reads gitignore as .gitignore, and so does a release that shipped .gitignore itself', () => {
    expect(projectPath('gitignore')).toBe('.gitignore');
    expect(projectPath('.gitignore')).toBe('.gitignore');
    expect(projectPath('src/lib/cn.ts')).toBe('src/lib/cn.ts');
  });
  it("lists a release's payload by project path", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-shipped-')); tmp.push(root);
    fs.mkdirSync(path.join(root, 'payload/src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'payload/gitignore'), 'node_modules\n');
    fs.writeFileSync(path.join(root, 'payload/src/a.ts'), '');
    expect(payloadList(root)).toEqual(['.gitignore', 'src/a.ts']);
  });
});
