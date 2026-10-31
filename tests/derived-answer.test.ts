// @vitest-environment node
// An answer built from records says when it was built and what it was built from, and a read never relabels a stale
// answer as fresh.
import { describe, expect, it } from 'vitest';
import { derivedAnswer } from '@/data/derived';
import type { AccessScope } from '@/data/access';

/** A scope as `resolveAccess` answers one: every identity component partitions the answer's slot. */
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
    let sources = 0;
    const run = () => derivedAnswer({ name: 'test-repeat', scope: scopeOf('demo'), source: async () => { sources += 1; return { revision: 'boot:1' }; }, build: async () => { builds += 1; return builds; } });
    const first = await run();
    const second = await run();
    expect(builds).toBe(1);
    expect(sources).toBe(2);
    expect(second.builtAt).toBe(first.builtAt);
    expect(second.data).toBe(first.data);
  });

  it('is never one tenant\'s answer served to another', async () => {
    // An unchanged revision does not make answers built under different tenants interchangeable.
    const run = (tenantId: string) => derivedAnswer({ name: 'test-tenants', scope: scopeOf(tenantId), source: async () => ({ revision: 'boot:1' }), build: async () => tenantId });
    expect((await run('a')).data).toBe('a');
    expect((await run('b')).data).toBe('b');
    expect((await run('a')).data).toBe('a');
  });

  it.each(['subjectId', 'authorizationKey'] as const)('isolates answers by %s even within one tenant and revision', async (field) => {
    const firstScope = scopeOf('demo');
    const otherScope = { ...firstScope, [field]: `other-${field}` };
    const read = (scope: AccessScope, value: string) => derivedAnswer({
      name: `test-scope-${field}`,
      scope,
      source: async () => ({ revision: 'boot:1' }),
      build: async () => value,
    });
    const first = await read(firstScope, 'private first answer');
    expect((await read(otherScope, 'private other answer')).data).toBe('private other answer');
    expect(await read(firstScope, 'not rebuilt')).toBe(first);
  });

  it('keeps identity components distinct when they contain separators', async () => {
    const identities = [
      { scope: { tenantId: 'a/b', subjectId: 'c', authorizationKey: 'd' }, name: 'e' },
      { scope: { tenantId: 'a', subjectId: 'b/c', authorizationKey: 'd' }, name: 'e' },
      { scope: { tenantId: 'a', subjectId: 'b', authorizationKey: 'c/d' }, name: 'e' },
      { scope: { tenantId: 'a', subjectId: 'b', authorizationKey: 'c' }, name: 'd/e' },
    ];
    for (const [index, identity] of identities.entries()) {
      const answer = await derivedAnswer({
        ...identity,
        source: async () => ({ revision: 'boot:1' }),
        build: async () => index,
      });
      expect(answer.data).toBe(index);
    }
    for (const [index, identity] of identities.entries()) {
      const answer = await derivedAnswer({
        ...identity,
        source: async () => ({ revision: 'boot:1' }),
        build: async () => -1,
      });
      expect(answer.data).toBe(index);
    }
  });

  it('never joins a pending build under another authorization identity', async () => {
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<string>();
    const first = derivedAnswer({
      name: 'test-pending-scope',
      scope: scopeOf('demo'),
      source: async () => ({ revision: 'boot:1' }),
      build: async () => { started.resolve(); return finish.promise; },
    });
    await started.promise;
    const other = derivedAnswer({
      name: 'test-pending-scope',
      scope: { ...scopeOf('demo'), authorizationKey: 'other-permissions' },
      source: async () => ({ revision: 'boot:1' }),
      build: async () => 'other private answer',
    });
    finish.resolve('first private answer');
    const answers = await Promise.all([first, other]);
    expect(answers.map((answer) => answer.data)).toEqual(['first private answer', 'other private answer']);
  });

  it('rejects a denied source even while an authorized build is pending', async () => {
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<string>();
    let deniedSources = 0;
    let deniedBuilds = 0;
    const first = derivedAnswer({
      name: 'test-pending-denied',
      scope: scopeOf('demo'),
      source: async () => ({ revision: 'boot:1' }),
      build: async () => { started.resolve(); return finish.promise; },
    });
    await started.promise;
    const denied = derivedAnswer({
      name: 'test-pending-denied',
      scope: scopeOf('demo'),
      source: async () => { deniedSources += 1; throw new Error('denied'); },
      build: async () => { deniedBuilds += 1; return 'must not build'; },
    });
    const rejection = expect(denied).rejects.toThrow('denied');
    finish.resolve('authorized answer');
    await rejection;
    expect((await first).data).toBe('authorized answer');
    expect(deniedSources).toBe(1);
    expect(deniedBuilds).toBe(0);
  });

  it('checks each source while sharing one pending build, then rebuilds on a later changed read', async () => {
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<string>();
    let revision = 'boot:1';
    let sources = 0;
    let builds = 0;
    const read = () => derivedAnswer({
      name: 'test-pending-revision',
      scope: scopeOf('demo'),
      source: async () => { sources += 1; return { revision }; },
      build: async () => {
        builds += 1;
        if (builds === 1) { started.resolve(); return finish.promise; }
        return 'second answer';
      },
    });
    const first = read();
    await started.promise;
    const sameRevision = read();
    revision = 'boot:2';
    const changedRevision = read();
    finish.resolve('first answer');
    const [answer, same, changed] = await Promise.all([first, sameRevision, changedRevision]);
    expect(sources).toBe(3);
    expect(builds).toBe(1);
    expect(same).toBe(answer);
    expect(changed).toBe(answer);
    expect(answer.sourceRevision).toBe('boot:1');
    const rebuilt = await read();
    expect(sources).toBe(4);
    expect(builds).toBe(2);
    expect(rebuilt.data).toBe('second answer');
    expect(rebuilt.sourceRevision).toBe('boot:2');
  });

  it('does not replace an answer published while an overlapping source check was awaiting', async () => {
    const delayedSource = Promise.withResolvers<{ revision: string }>();
    let delayedBuilds = 0;
    const delayed = derivedAnswer({
      name: 'test-source-order',
      scope: scopeOf('demo'),
      source: () => delayedSource.promise,
      build: async () => { delayedBuilds += 1; return 'delayed answer'; },
    });
    const published = await derivedAnswer({
      name: 'test-source-order',
      scope: scopeOf('demo'),
      source: async () => ({ revision: 'published' }),
      build: async () => 'published answer',
    });
    delayedSource.resolve({ revision: 'delayed' });
    expect(await delayed).toBe(published);
    expect(delayedBuilds).toBe(0);
  });

  it('rejects a failed source instead of serving an answer it already holds', async () => {
    let denied = false;
    let builds = 0;
    const read = () => derivedAnswer({
      name: 'test-held-denied',
      scope: scopeOf('demo'),
      source: async () => { if (denied) throw new Error('denied'); return { revision: 'boot:1' }; },
      build: async () => { builds += 1; return 'private answer'; },
    });
    await read();
    denied = true;
    await expect(read()).rejects.toThrow('denied');
    expect(builds).toBe(1);
  });

  it('retries a failed first build without inventing a build moment', async () => {
    let builds = 0;
    const read = () => derivedAnswer({
      name: 'test-first-build-failure',
      scope: scopeOf('demo'),
      source: async () => ({ revision: 'boot:1' }),
      build: async () => { builds += 1; if (builds === 1) throw new Error('build failed'); return 'built'; },
    });
    expect(await read()).toEqual({ data: null, builtAt: '', sourceRevision: 'boot:1' });
    const retried = await read();
    expect(builds).toBe(2);
    expect(retried.data).toBe('built');
    expect(retried.sourceRevision).toBe('boot:1');
    expect(retried.builtAt).not.toBe('');
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
});
