// @vitest-environment node
// An answer built from records says when it was built and what it was built from, and a read never relabels a stale
// answer as fresh.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { derivedAnswer } from '@/data/derived';
import { serviceUptime } from '@/data/uptime';

const ROOT = path.resolve(import.meta.dirname, '..');
/** A scope as `resolveAccess` answers one: the answer's slot is named by its tenant and by nothing else of the person. */
const scopeOf = (tenantId: string) => ({ tenantId, subjectId: 'maya', authorizationKey: `key:${tenantId}` });

describe('a derived answer', () => {
  it('carries the moment it was built and the source state it was built from', async () => {
    let builds = 0;
    const read = () => derivedAnswer({ name: 'test-answer', scope: scopeOf('demo'), source: async () => ({ revision: 'boot:1' }), build: async () => { builds += 1; return builds; } });
    const first = await read();
    expect(first.sourceRevision).toBe('boot:1');
    expect(typeof first.builtAt).toBe('string');
    expect(first.data).toBe(1);
  });

  it('rebuilds nothing, and keeps its build moment, when the source has not moved', async () => {
    let builds = 0;
    const run = () => derivedAnswer({ name: 'test-repeat', scope: scopeOf('demo'), source: async () => ({ revision: 'boot:1' }), build: async () => { builds += 1; return builds; } });
    const first = await run();
    const second = await run();
    expect(builds).toBe(1);
    expect(second.builtAt).toBe(first.builtAt);
    expect(second.data).toBe(first.data);
  });

  it('is never one tenant\'s answer served to another', async () => {
    // The slot is named by the answer's tenant as well as its name. A product that isolates tenants — which is the
    // scope the standard describes and this factory is the example of — would otherwise hand one tenant the rows
    // another's build read, under that tenant's revision.
    const run = (tenantId: string) => derivedAnswer({ name: 'test-tenants', scope: scopeOf(tenantId), source: async () => ({ revision: 'boot:1' }), build: async () => tenantId });
    expect((await run('a')).data).toBe('a');
    expect((await run('b')).data).toBe('b');
    expect((await run('a')).data).toBe('a');
  });

  it('keeps the answer it has when a rebuild fails, rather than relabelling it', async () => {
    let fail = false;
    const run = () => derivedAnswer({
      name: 'test-failure',
      scope: scopeOf('demo'),
      source: async () => ({ revision: fail ? 'boot:2' : 'boot:1' }),
      build: async () => { if (fail) throw new Error('the read failed'); return 'first'; },
    });
    const first = await run();
    fail = true;
    const second = await run();
    expect(second.data).toBe('first');
    expect(second.builtAt).toBe(first.builtAt);
    expect(second.sourceRevision).toBe('boot:1');
  });

  it('is the sample\'s own answer, and the Services page reads it as one', () => {
    // The factory above is the shape; this is the instance the standard will name as its worked example.
    expect(typeof serviceUptime).toBe('function');
    const page = fs.readFileSync(path.join(ROOT, 'app/(dashboard)/services/page.tsx'), 'utf8');
    const view = fs.readFileSync(path.join(ROOT, 'src/views/services.tsx'), 'utf8');
    expect(page).toMatch(/serviceUptime\(/);
    expect(page, 'the page hands the view the build moment it was given').toMatch(/builtAt/);
    expect(view, 'the view takes the build moment').toMatch(/builtAt/);
  });
});
