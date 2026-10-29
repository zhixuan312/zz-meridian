// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { run } from '../cli/src/files.ts';

// A quiet run pipes the child's output, and Node kills a child past 1 MiB of it by default: a long gate, build or
// install reached update's finalize as "exited with 1" over a cut log.
describe('a quiet command with a long output', () => {
  it('runs to its own end and keeps all of it', () => {
    const r = run(process.execPath, ['-e', "process.stdout.write('x'.repeat(3 * 1024 * 1024))"], process.cwd(), true);
    expect(r.status).toBe(0);
    expect(r.stdout.length).toBe(3 * 1024 * 1024);
  });
});
