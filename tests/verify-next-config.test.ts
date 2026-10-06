// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { distDirOf } from '../scripts/lib/next-config.ts';

const dirs: string[] = [];
const project = (files: Record<string, string>) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-next-config-'));
  dirs.push(dir);
  for (const [f, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), text);
  return dir;
};
afterAll(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

describe("the build folder a project's Next config names", () => {
  it('reads next.config.ts', async () => {
    expect(await distDirOf(project({ 'next.config.ts': "export default { distDir: 'out-ts' };\n" }))).toBe('out-ts');
  });
  it('reads next.config.mjs and next.config.js, as an adopted project may write it', async () => {
    expect(await distDirOf(project({ 'next.config.mjs': "export default { distDir: 'out-mjs' };\n" }))).toBe('out-mjs');
    expect(await distDirOf(project({ 'next.config.js': "module.exports = { distDir: 'out-js' };\n", 'package.json': '{}' }))).toBe('out-js');
  });
  it('calls a config written as a function', async () => {
    expect(await distDirOf(project({ 'next.config.mjs': "export default () => ({ distDir: 'out-fn' });\n" }))).toBe('out-fn');
  });
  it('is .next with no config, or a config that names no distDir', async () => {
    expect(await distDirOf(project({}))).toBe('.next');
    expect(await distDirOf(project({ 'next.config.mjs': 'export default {};\n' }))).toBe('.next');
  });
});
