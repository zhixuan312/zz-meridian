// @vitest-environment node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * The Postgres code the skill's references hand a team, run against a real Postgres. A recipe in a reference is compiled
 * by nothing and run by nothing (references/live.md says so of its adapters), and every database finding so far reached
 * Meridian from an adopter's production: an idle connection the database closed ended the server (#16), a pooler refused
 * the pool's settings (#17). Here the LISTEN and NOTIFY adapter of references/live.md runs as it is written, and the pool
 * guidance of references/existing-project.md is held to what it says happens with its listener and without it.
 *
 * It needs MERIDIAN_POSTGRES_URL, a database whose tables it may write and whose connections it may end (never a
 * product's), MERIDIAN_POOLER_URL, the same database through PgBouncer in transaction mode with one server connection,
 * and MERIDIAN_PG, a directory whose node_modules holds `pg`, which the template does not install; it refuses to run
 * without them rather than skip. It lives beside the fixtures, outside tests/, so the gate and the deep suite never
 * collect it: the weekly job `postgres` runs it with its own config (vitest.config.ts beside it), against service
 * containers.
 */
const DATABASE = process.env.MERIDIAN_POSTGRES_URL;
const POOLER = process.env.MERIDIAN_POOLER_URL;
const PG = process.env.MERIDIAN_PG;
if (!DATABASE || !POOLER || !PG) throw new Error('postgres: set MERIDIAN_POSTGRES_URL, MERIDIAN_POOLER_URL and MERIDIAN_PG (see the comment above)');
const ROOT = path.resolve(import.meta.dirname, '../../..');
const CHANNEL = 'meridian_changes';

/** The fenced `ts` block of a reference whose first line is `first`, as the reference has it. */
function recipe(file: string, first: string): string {
  const text = fs.readFileSync(path.join(ROOT, 'skills/zz-meridian/references', file), 'utf8');
  const block = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]).find((b) => b.startsWith(first));
  if (!block) throw new Error(`references/${file}: no ts block starts with ${first}`);
  return block;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(what: string, ok: () => boolean | Promise<boolean>, within = 10_000) {
  for (const t = Date.now(); !(await ok()); await sleep(25)) if (Date.now() - t > within) throw new Error(`${what}: not within ${within} ms`);
}

type Tx = { query: (sql: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>; release: () => void };
type Db = { query: Tx['query']; connect: () => Promise<Tx | void>; end: () => Promise<void>; on: (e: string, f: (e: Error) => void) => void };
type Live = (url: string) => (tenantId: string, name: string) => (deliver: () => void) => () => void;

describe('the Postgres the references hand a team', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-postgres-'));
  let pg: { Client: new (o: object) => Db; Pool: new (o: object) => Db };
  let admin: Db;
  let pool: Db;
  let live: { postgresLive: Live; notifyChange: (tx: Tx, tenantId: string, name: string) => Promise<void> };
  const listening = async () => Number((await admin.query('select count(*)::int as n from pg_stat_activity where query = $1', [`LISTEN ${CHANNEL}`])).rows[0].n);
  const commit = async (tenant: string, name: string, end: 'commit' | 'rollback' = 'commit') => {
    const tx = (await pool.connect()) as Tx;
    try {
      await tx.query('begin');
      await live.notifyChange(tx, tenant, name);
      await tx.query(end);
    } finally { tx.release(); }
  };

  beforeAll(async () => {
    fs.symlinkSync(path.join(PG, 'node_modules'), path.join(work, 'node_modules'));
    fs.writeFileSync(path.join(work, 'postgres-live.ts'), recipe('live.md', '// example: src/data/postgres-live.ts'));
    fs.writeFileSync(path.join(work, 'pg.mjs'), "export { Client, Pool } from 'pg';\n");
    pg = await import(pathToFileURL(path.join(work, 'pg.mjs')).href);
    live = await import(pathToFileURL(path.join(work, 'postgres-live.ts')).href);
    admin = new pg.Client({ connectionString: DATABASE });
    await admin.connect();
    pool = new pg.Pool({ connectionString: DATABASE });
    pool.on('error', () => {});
  });
  afterAll(async () => {
    await pool?.end();
    await admin?.end();
    fs.rmSync(work, { recursive: true, force: true });
  });

  describe('references/live.md: LISTEN and NOTIFY', () => {
    const got = { am: 0, bm: 0, ar: 0 };
    let offs: (() => void)[] = [];

    it('reads every subscriber once on connecting, and a committed change reaches its tenant and collection only', async () => {
      const subscribe = live.postgresLive(DATABASE);
      offs = [subscribe('a', 'members')(() => got.am++), subscribe('b', 'members')(() => got.bm++), subscribe('a', 'requests')(() => got.ar++)];
      await until('the resync on connecting', () => got.am === 1 && got.bm === 1 && got.ar === 1);
      expect(await listening(), 'one listening connection for every subscriber').toBe(1);
      await commit('a', 'members');
      await until("tenant a's members hint", () => got.am === 2);
      await sleep(300);
      expect(got).toEqual({ am: 2, bm: 1, ar: 1 });
    });

    it('sends nothing for a change that rolled back', async () => {
      await commit('a', 'members', 'rollback');
      await sleep(500);
      expect(got).toEqual({ am: 2, bm: 1, ar: 1 });
    });

    it('comes back after the database ends its connection, and has every subscriber read again', async () => {
      await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where query = $1', [`LISTEN ${CHANNEL}`]);
      await until('the resync after the listener came back', () => got.am === 3 && got.bm === 2 && got.ar === 2);
      expect(await listening()).toBe(1);
      await commit('b', 'members');
      await until("tenant b's members hint after the reconnect", () => got.bm === 3);
    });

    it('closes its connection when the last subscriber leaves', async () => {
      for (const off of offs) off();
      await until('the listening connection closed', async () => (await listening()) === 0);
    });
  });

  describe('references/existing-project.md: the pool survives a dropped connection', () => {
    // The pool the reference describes: idle connections kept for minutes, a connection timeout, and its listener or not.
    const POOL = `import { Client, Pool } from 'pg';
const name = 'meridian-pool-' + process.pid;
const pool = new Pool({ connectionString: process.env.DATABASE, idleTimeoutMillis: 300_000, connectionTimeoutMillis: 5_000, application_name: name });
if (process.argv[2] === 'listening') pool.on('error', (e) => console.error('db: an idle connection closed', e.message));
await pool.query('select 1');
const admin = new Client({ connectionString: process.env.DATABASE });
await admin.connect();
await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where application_name = $1', [name]);
await admin.end();
await new Promise((r) => setTimeout(r, 500));
console.log('read', (await pool.query('select 2 as n')).rows[0].n);
await pool.end();
`;
    const run = (mode: string) => {
      fs.writeFileSync(path.join(work, 'pool.mjs'), POOL);
      return spawnSync(process.execPath, [path.join(work, 'pool.mjs'), mode], { cwd: work, encoding: 'utf8', env: { ...process.env, DATABASE }, timeout: 30_000 });
    };

    it('with its listener, logs the loss and reads again', () => {
      const r = run('listening');
      expect(r.status, r.stderr).toBe(0);
      expect(r.stderr).toContain('db: an idle connection closed');
      expect(r.stdout).toContain('read 2');
    });

    it('without it, ends the process, as the reference says', () => {
      const r = run('bare');
      expect(r.status).not.toBe(0);
      expect(r.stdout).not.toContain('read 2');
      expect(r.stderr).toMatch(/terminat/i);
    });
  });

  describe('references/existing-project.md: behind a transaction pooler', () => {
    it('refuses a pool given a session setting, at connect', async () => {
      const p = new pg.Pool({ connectionString: POOLER, options: '-c statement_timeout=5000' });
      p.on('error', () => {});
      await expect(p.query('select 1')).rejects.toThrow(/unsupported startup parameter/);
      await p.end();
    });

    it('holds a limit set with SET LOCAL inside its transaction, and only there', async () => {
      const p = new pg.Pool({ connectionString: POOLER });
      const tx = (await p.connect()) as Tx;
      await tx.query('begin');
      await tx.query("set local statement_timeout = '100ms'");
      await expect(tx.query('select pg_sleep(1)')).rejects.toThrow(/statement timeout/);
      await tx.query('rollback');
      tx.release();
      expect((await p.query('show statement_timeout')).rows[0].statement_timeout).toBe('0');
      await p.end();
    });

    // Two clients of one database: a session advisory lock taken by the first stops the second when they hold their own
    // sessions, and does not through the pooler, where both run on its one server connection.
    const lockedTwice = async (url: string) => {
      const [a, b] = [new pg.Client({ connectionString: url }), new pg.Client({ connectionString: url })];
      await a.connect();
      await b.connect();
      try {
        const take = async (c: Db) => (await c.query('select pg_try_advisory_lock(4242) as ok')).rows[0].ok;
        return [await take(a), await take(b)];
      } finally {
        await a.query('select pg_advisory_unlock_all()');
        await b.query('select pg_advisory_unlock_all()');
        await a.end();
        await b.end();
      }
    };
    it('does not keep a session advisory lock from another client, which a direct connection does', async () => {
      expect(await lockedTwice(DATABASE), 'direct').toEqual([true, false]);
      expect(await lockedTwice(POOLER), 'through the pooler').toEqual([true, true]);
    });
  });
});
