// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the template's own git index.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PAYLOAD_EXCLUDE } from '../cli/scripts/build-payload.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-scripts-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('the scripts Meridian ships, in a product set up by an earlier release', () => {
  it('type check against the verify.config.ts that release wrote, which the team owns and update never replaces', () => {
    const shipped = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', 'scripts'], { cwd: ROOT, encoding: 'utf8' })
      .split('\0').filter((f) => f && /\.ts$/.test(f) && !PAYLOAD_EXCLUDE.test(f) && f !== 'scripts/verify.config.ts' && fs.existsSync(path.join(ROOT, f)));
    expect(shipped.length).toBeGreaterThan(15);
    for (const f of [...shipped, 'next.config.ts', 'src/app.config.ts', 'tsconfig.json', 'package.json']) {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
    }
    for (const d of ['src', 'app', 'tokens', 'next-env.d.ts']) if (fs.existsSync(path.join(ROOT, d))) fs.cpSync(path.join(ROOT, d), path.join(dir, d), { recursive: true, force: false, errorOnExist: false });
    // The bytes published 0.3.0 wrote, kept beside the test: a CI checkout has no tags to read them from.
    fs.copyFileSync(path.join(ROOT, 'cli/test/verify.config.0.3.0.ts.txt'), path.join(dir, 'scripts/verify.config.ts'));
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
    const options = { strict: true, noEmit: true, skipLibCheck: true, target: 'ES2022', module: 'esnext', moduleResolution: 'bundler', allowImportingTsExtensions: true, resolveJsonModule: true, types: ['node'], paths: { '@/*': ['./src/*'] }, jsx: 'react-jsx', lib: ['dom', 'dom.iterable', 'esnext'] };
    fs.writeFileSync(path.join(dir, 'tsconfig.scripts.json'), JSON.stringify({ compilerOptions: options, files: shipped }));
    const tsc = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.scripts.json'], { cwd: dir, encoding: 'utf8' });
    expect(tsc.stdout + tsc.stderr).toBe('');
    expect(tsc.status).toBe(0);
  }, 120_000);
});
