// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { NEXT_CONFIG_FILES, nextConfigFiles } from '../cli/src/next-config.ts';

const dirs: string[] = [];
const project = (files: Record<string, string>) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-next-config-'));
  dirs.push(dir);
  for (const [f, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), text);
  return dir;
};
afterAll(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

describe("the config file Next itself reads", () => {
  it("is the first of Next's own order: js, mjs, ts, mts — never cjs", () => {
    // CONFIG_FILES in next/dist/shared/lib/constants.js.
    expect(NEXT_CONFIG_FILES).toEqual(['next.config.js', 'next.config.mjs', 'next.config.ts', 'next.config.mts']);
    expect(nextConfigFiles(project({ 'next.config.ts': 'export default {};\n', 'next.config.js': 'module.exports = {};\n' }))).toEqual(['next.config.js', 'next.config.ts']);
  });
});
