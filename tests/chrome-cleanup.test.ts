// @vitest-environment node
import { spawn, spawnSync } from 'node:child_process';
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

  // Every check ends `page.close(); process.exit(...)`. The profile's removal is started in the background (a timed hook
  // must not wait for it), and a process that exits at once never finished it: measured, three runs left three profiles,
  // and two days of checks left 590 of them, 29 GB, in the temp folder.
  it('removes the profile of a browser closed just before the script exits', () => {
    const here = fs.mkdtempSync(path.join(work, 'closed-'));
    const fake = path.join(here, 'chrome');
    // A stand-in that fills its profile, as a browser that loaded pages has, and is gone before it is asked anything.
    fs.writeFileSync(fake, `#!/bin/sh\nfor a in "$@"; do case "$a" in --user-data-dir=*) d="\${a#--user-data-dir=}";; esac; done\necho "$d" > "${here}/dir"\nmkdir -p "$d/Default/Cache"\ni=0; while [ $i -lt 400 ]; do echo x > "$d/Default/Cache/f$i"; i=$((i+1)); done\nexit 3\n`, { mode: 0o755 });
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', `import { launch } from './scripts/lib/chrome.ts'; try { await launch(); } catch (e) { console.log(e.message); } process.exit(0);`], { cwd: ROOT, env: { ...process.env, CHROME: fake }, encoding: 'utf8' });
    expect(run.stdout).toContain('Chrome exited before it started (3)');
    expect(fs.existsSync(fs.readFileSync(path.join(here, 'dir'), 'utf8').trim())).toBe(false);
  }, 60_000);

  // A check that is ended from outside runs no `finally`, and one that is killed outright runs no exit handler either.
  // Reproduced before this was written: a script ended by SIGHUP, SIGQUIT or SIGKILL each left a whole browser running
  // under launchd, which is what a machine sweep later finds as a Chrome nobody owns.
  it.each(['SIGHUP', 'SIGQUIT', 'SIGKILL'] as const)('leaves no browser behind when the script is ended by %s', async (signal) => {
    const here = fs.mkdtempSync(path.join(work, 'ended-'));
    const fake = path.join(here, 'chrome');
    const pidFile = path.join(here, 'pid');
    // A stand-in that stays up and keeps its arguments on its command line, as Chrome does.
    fs.writeFileSync(fake, `#!${process.execPath}\nconst fs = require('node:fs');\nfs.writeFileSync(${JSON.stringify(path.join(here, 'dir'))}, process.argv.find((a) => a.startsWith('--user-data-dir=')).slice(16));\nfs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));\nsetInterval(() => {}, 1000);\n`, { mode: 0o755 });
    const script = spawn(process.execPath, ['--input-type=module', '-e', `import { launch } from './scripts/lib/chrome.ts'; await launch().catch(() => {});`], { cwd: ROOT, env: { ...process.env, CHROME: fake }, stdio: 'ignore' });
    const until = async (done: () => boolean, ms: number) => { for (const end = Date.now() + ms; Date.now() < end && !done();) await new Promise((r) => setTimeout(r, 50)); return done(); };
    expect(await until(() => fs.existsSync(pidFile), 20_000)).toBe(true);
    const pid = Number(fs.readFileSync(pidFile, 'utf8'));
    const dir = fs.readFileSync(path.join(here, 'dir'), 'utf8');
    const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
    expect(alive()).toBe(true);
    script.kill(signal);
    try {
      expect(await until(() => !alive(), 10_000)).toBe(true);
      expect(await until(() => !fs.existsSync(dir), 5_000)).toBe(true);
    } finally {
      if (alive()) process.kill(pid, 'SIGKILL');
    }
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
