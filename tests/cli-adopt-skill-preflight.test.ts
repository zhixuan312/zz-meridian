// @vitest-environment node
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { adopt } from '../cli/src/adopt.ts';
import { payloadBytes } from '../cli/src/files.ts';

const dirs: string[] = [];
const temp = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adopt-skill-preflight-')); dirs.push(dir); return dir; };
const put = (root: string, rel: string, content: string | Buffer) => {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return abs;
};
// Include links themselves, never the external files they name.
const snapshot = (root: string): Record<string, string> => Object.fromEntries(fs.readdirSync(root, { recursive: true, withFileTypes: true }).filter((entry) => !entry.isDirectory()).map((entry) => {
  const abs = path.join(entry.parentPath, entry.name);
  return [path.relative(root, abs), entry.isSymbolicLink() ? `link:${fs.readlinkSync(abs)}` : createHash('sha256').update(fs.readFileSync(abs)).digest('hex')];
}));
afterAll(() => { for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true }); });

describe('adopt skill preflight', () => {
  it.each(['file', 'folder', 'dangling'] as const)('refuses a %s skill link before changing the project', (kind) => {
    const root = temp(), outside = temp();
    put(root, 'package.json', JSON.stringify({ name: 'sample', type: 'module', dependencies: { next: '16.4.2' } }));
    put(root, 'tsconfig.json', '{}');
    put(root, 'app/layout.tsx', 'export default function Layout({ children }) { return children; }\n');
    const rel = '.claude/skills/zz-meridian/SKILL.md';
    const target = put(outside, 'SKILL.md', payloadBytes('skills/zz-meridian/SKILL.md'));
    const link = path.join(root, kind === 'folder' ? path.dirname(rel) : rel);
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(kind === 'folder' ? outside : kind === 'dangling' ? path.join(outside, 'absent') : target, link);
    const before = snapshot(root), external = snapshot(outside);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    let result: unknown;
    try { result = adopt({ root, brand: {}, allowDirty: true, install: false }); }
    catch (e) { result = e; }
    finally { error.mockRestore(); log.mockRestore(); }
    expect(snapshot(root)).toEqual(before);
    expect(snapshot(outside)).toEqual(external);
    expect(result).toBe(1);
  });
});
