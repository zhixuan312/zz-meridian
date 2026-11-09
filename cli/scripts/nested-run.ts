/**
 * A failed nested command's cause, for the smoke's job log.
 *
 * The smoke runs a dashboard's own `test:release` and, when it failed, printed the last 40 lines of stdout followed by
 * stderr. The stderr tail — a test's simulated provider failure, `act()` warnings — buried the `test:release: FAIL:`
 * verdict and vitest's counts in run 42646698631, so the release could not say what failed. The cause lines are chosen
 * by their shape, and the whole output is kept in out/, which the release and weekly consumer jobs upload.
 */
import fs from 'node:fs';
import path from 'node:path';

/** The lines that name a failed run's cause: its own verdict, the failing files, vitest's counts. */
export function causeLines(stdout: string, stderr: string): string[] {
  return [...stdout.split('\n'), ...stderr.split('\n')].filter((line) =>
    /^test:release:/.test(line)                    // scripts/test-run.ts's verdict and summary
    || /^\s*FAIL\s{2}\S/.test(line)                // vitest's failing file, written to stderr
    || /^\s*Test Files\s{2,}\d/.test(line)         // vitest's file counts
    || /^\s*Tests\s{2,}\d/.test(line));            // vitest's test counts
}

/** Writes a nested run's whole output beside itself as `${name}.stdout.txt` and `${name}.stderr.txt`; returns both names. */
export function writeNestedRun(dir: string, name: string, run: { stdout: string; stderr: string }): string[] {
  fs.mkdirSync(dir, { recursive: true });
  const files = [`${name}.stdout.txt`, `${name}.stderr.txt`];
  fs.writeFileSync(path.join(dir, files[0]!), run.stdout);
  fs.writeFileSync(path.join(dir, files[1]!), run.stderr);
  return files;
}
