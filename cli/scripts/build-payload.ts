/**
 * Build cli/payload/: the template snapshot the package carries.
 *
 *   node cli/scripts/build-payload.ts            the committed tree at HEAD (what a release ships)
 *   node cli/scripts/build-payload.ts --worktree the working tree's tracked files, for trying a change before committing
 *
 * From git, never from a walk of the folder: a build output, a local .env or a stray file cannot reach the package.
 * The package's own source, the CI workflows and agent settings stay out.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { shippedPath } from '../src/files.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = path.join(ROOT, 'cli/payload');
const worktree = process.argv.includes('--worktree');

/** Never shipped: the package itself, CI, agent settings, Meridian's own demo deployment, and anything that could hold a secret. */
// The CLI's own tests import cli/src, which a project never has: shipped, they would fail its type check. The fixtures
// under scripts/fixtures/ serve those tests alone and import the template's own team-owned starters. The deep-* tests drive
// those fixtures in headless Chrome.
export const PAYLOAD_EXCLUDE = /^(cli\/|\.github\/|\.claude\/|\.agents\/|\.mma\/|out\/|node_modules\/|scripts\/fixtures\/|tests\/(cli-[^/]*|deep-[^/]*|context-guidance)\.test\.ts$|\.env(?!\.example$)|.*\.tsbuildinfo$|(Dockerfile|captain-definition|\.dockerignore)$)/;

if (import.meta.main) {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // HEAD: the committed bytes, extracted by git archive whatever the working tree holds now.
  const STAGE = path.join(ROOT, 'cli/.payload-stage');
  fs.rmSync(STAGE, { recursive: true, force: true });
  fs.mkdirSync(STAGE, { recursive: true });
  let from = ROOT;
  let files: string[];
  if (worktree) {
    files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT }).toString('utf8').split('\0').filter(Boolean);
  } else {
    const tar = path.join(STAGE, 'head.tar');
    fs.writeFileSync(tar, execFileSync('git', ['archive', '--format=tar', 'HEAD'], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 }));
    fs.mkdirSync(path.join(STAGE, 'tree'));
    execFileSync('tar', ['-xf', tar, '-C', path.join(STAGE, 'tree')]);
    from = path.join(STAGE, 'tree');
    files = execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', 'HEAD'], { cwd: ROOT }).toString('utf8').split('\0').filter(Boolean);
  }

  let n = 0;
  for (const f of files.filter((x) => !PAYLOAD_EXCLUDE.test(x))) {
    const src = path.join(from, f);
    const st = fs.lstatSync(src, { throwIfNoEntry: false });
    // A deleted file still in the index, a symbolic link or anything but a plain file is not shipped.
    if (!st?.isFile()) continue;
    const dst = path.join(OUT, shippedPath(f));
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    n++;
  }
  fs.rmSync(STAGE, { recursive: true, force: true });
  console.log(`payload: ${n} files from ${worktree ? 'the working tree' : 'HEAD'}`);
}
