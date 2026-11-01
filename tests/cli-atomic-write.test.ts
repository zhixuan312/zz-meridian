// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeAtomic } from '../cli/src/session.ts';

const dirs: string[] = [];
const temp = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-atomic-')); dirs.push(dir); return dir; };
afterEach(() => { vi.restoreAllMocks(); for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

describe('atomic project writes', () => {
  it('does not follow a pre-existing link at the old predictable temporary path', () => {
    const root = temp(), external = path.join(temp(), 'team.txt');
    const target = path.join(root, 'config.json');
    fs.writeFileSync(target, 'old configuration');
    fs.writeFileSync(external, 'external content');
    fs.symlinkSync(external, `${target}.${process.pid}.zz-tmp`);
    writeAtomic(target, 'new configuration');
    expect(fs.readFileSync(external, 'utf8')).toBe('external content');
    expect(fs.readFileSync(target, 'utf8')).toBe('new configuration');
    expect(fs.lstatSync(target).isFile()).toBe(true);
  });

  it('keeps the original file and removes its temporary output when replacement fails', () => {
    const root = temp(), target = path.join(root, 'config.json');
    fs.writeFileSync(target, 'original');
    vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw new Error('replacement refused'); });
    expect(() => writeAtomic(target, 'replacement')).toThrow('replacement refused');
    expect(fs.readFileSync(target, 'utf8')).toBe('original');
    expect(fs.readdirSync(root)).toEqual(['config.json']);
  });

  it('preserves an explicitly supplied mode while replacing the complete contents', () => {
    const target = path.join(temp(), 'private.json');
    writeAtomic(target, 'first', 0o600);
    writeAtomic(target, 'second', 0o600);
    expect(fs.readFileSync(target, 'utf8')).toBe('second');
    expect(fs.statSync(target).mode & 0o777).toBe(0o600);
  });
});
