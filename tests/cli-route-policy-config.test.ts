// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the template's own git history.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-route-policy-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('the managed route policy in a product set up by an earlier release', () => {
  it('type checks against the verify.config.ts that release wrote, which the team owns and update never replaces', () => {
    fs.mkdirSync(path.join(dir, 'scripts'));
    fs.copyFileSync(path.join(ROOT, 'scripts/route-policy.ts'), path.join(dir, 'scripts/route-policy.ts'));
    fs.copyFileSync(path.join(ROOT, 'next.config.ts'), path.join(dir, 'next.config.ts'));
    fs.writeFileSync(path.join(dir, 'scripts/verify.config.ts'), execFileSync('git', ['show', 'v0.3.0:scripts/verify.config.ts'], { cwd: ROOT, encoding: 'utf8' }));
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
    const options = { strict: true, noEmit: true, skipLibCheck: true, target: 'ES2022', module: 'esnext', moduleResolution: 'bundler', allowImportingTsExtensions: true, types: ['node'] };
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: options, files: ['scripts/route-policy.ts'] }));
    const tsc = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], { cwd: dir, encoding: 'utf8' });
    expect(tsc.stdout + tsc.stderr).toBe('');
    expect(tsc.status).toBe(0);
  }, 60_000);
});
