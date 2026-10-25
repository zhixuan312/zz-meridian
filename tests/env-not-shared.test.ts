// @vitest-environment node
// The environment is the process's, not the file's: files share a worker (`pool: 'vmThreads'`). A file that stubs a
// store's variable for itself in a beforeAll — the natural way to exercise a stubbed Postgres — left it set for the
// file beside it, which then found a store configured and died on `getaddrinfo ENOTFOUND`. `tests/setup.ts` puts the
// environment back before every test; this is the proof, so the stub below is in a beforeAll on purpose (issue #95).
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

const NAME = 'DATABASE_URL';

describe('the environment between test files', () => {
  beforeAll(() => { process.env[NAME] = 'postgres://stub/db'; });

  test('is the one the setup found, so a stub in a beforeAll reaches no test at all', () => {
    expect(process.env[NAME]).toBeUndefined();
  });
});

describe('a stub a file sets for itself', () => {
  beforeEach(() => { process.env[NAME] = 'postgres://own/db'; });

  test('is there for the test that set it, which is why the stub belongs in a beforeEach', () => {
    expect(process.env[NAME]).toBe('postgres://own/db');
  });
});
