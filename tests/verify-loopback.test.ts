// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const spawned = vi.hoisted(() => ({ args: [] as unknown[][] }));
vi.mock('node:child_process', async (load) => ({ ...(await load<typeof import('node:child_process')>()), spawn: (...args: unknown[]) => { spawned.args.push(args); return {}; } }));

import { spawnNext } from '../scripts/lib/bin';

// The built app a run starts is for that run: the readiness probe, the browser, the assistant and the live run all
// reach it at 127.0.0.1. `next start` with no host binds every interface, so for the half hour a full run takes the
// app under test answered on the network (#81).
describe('the built app a run starts for itself (#81)', () => {
  it('starts bound to loopback, on the port asked for', () => {
    spawnNext(4123, process.env);
    const [, args] = spawned.args.at(-1)!;
    expect(args).toEqual(['start', '-H', '127.0.0.1', '-p', '4123']);
  });
});
