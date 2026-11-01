// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as Files from '../cli/src/files.ts';

const commands = vi.hoisted(() => ({ adopt: vi.fn(() => 0), create: vi.fn(() => 0), update: vi.fn(() => 0), brandCommand: vi.fn(() => 0), installSkill: vi.fn() }));
vi.mock('../cli/src/adopt.js', () => ({ adopt: commands.adopt }));
vi.mock('../cli/src/create.js', () => ({ create: commands.create }));
vi.mock('../cli/src/update.js', () => ({ update: commands.update }));
vi.mock('../cli/src/rebrand.js', () => ({ brandCommand: commands.brandCommand }));
vi.mock('../cli/src/files.js', async (original) => ({ ...await original<typeof Files>(), installSkill: commands.installSkill }));

const argv = process.argv;
const exitCode = process.exitCode;
afterEach(() => { process.argv = argv; process.exitCode = exitCode; vi.restoreAllMocks(); vi.clearAllMocks(); });

async function dispatch(args: string[]) {
  vi.resetModules();
  process.argv = [process.execPath, 'zz-meridian', ...args];
  // The executable dispatches at module load; each case must load it after replacing argv.
  await import('../cli/src/cli.ts');
}

describe('positional arguments before command mutation', () => {
  it.each([
    ['adopt', 'other-folder', '--allow-dirty', '--no-install'],
    ['create', 'dashboard', 'ignored-folder', '--no-install'],
    ['update', 'ignored-folder', '--abort'],
    ['brand', 'ignored-folder', '--name', 'Acme'],
    ['skill', 'ignored-folder'],
  ])('rejects extra arguments: %s', async (...args) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await dispatch(args);
    expect(process.exitCode).toBe(1);
    for (const mutate of Object.values(commands)) expect(mutate).not.toHaveBeenCalled();
  });

});
