// @vitest-environment node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-chrome-cleanup-'));
afterAll(() => fs.rmSync(work, { recursive: true, force: true }));

describe('scripts/lib/chrome.ts launch', () => {
  it('kills the browser it spawned and removes its profile when Chrome never answers', () => {
    // A stand-in browser that records its pid and never opens the debugging port.
    const fake = path.join(work, 'chrome');
    const pidFile = path.join(work, 'pid');
    fs.writeFileSync(fake, `#!/bin/sh\necho $$ > "${pidFile}"\nfor a in "$@"; do case "$a" in --user-data-dir=*) echo "\${a#--user-data-dir=}" > "${work}/dir";; esac; done\nexec sleep 300\n`, { mode: 0o755 });
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', `import { launch } from './scripts/lib/chrome.ts'; try { await launch(); } catch (e) { console.log(e.message); }`], { cwd: ROOT, env: { ...process.env, CHROME: fake }, encoding: 'utf8' });
    expect(run.stdout).toContain('Chrome did not start');
    const pid = Number(fs.readFileSync(pidFile, 'utf8'));
    const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
    for (let i = 0; i < 20 && alive(); i++) spawnSync('sleep', ['0.1']);
    expect(alive()).toBe(false);
    expect(fs.existsSync(fs.readFileSync(path.join(work, 'dir'), 'utf8').trim())).toBe(false);
  }, 60_000);

  it('says at once that a browser which exited never started, without waiting out the start-up deadline', () => {
    const fake = path.join(work, 'chrome-exits');
    fs.writeFileSync(fake, '#!/bin/sh\nexit 3\n', { mode: 0o755 });
    const started = Date.now();
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', `import { launch } from './scripts/lib/chrome.ts'; try { await launch(); } catch (e) { console.log(e.message); }`], { cwd: ROOT, env: { ...process.env, CHROME: fake }, encoding: 'utf8' });
    expect(run.stdout).toContain('Chrome exited before it started (3)');
    expect(Date.now() - started).toBeLessThan(15_000);
  }, 60_000);
});
