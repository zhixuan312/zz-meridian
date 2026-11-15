// @vitest-environment node
// The gate that decides whether the browser sweeps may press every control — Delete and Revoke included — against the
// project's data. It had no test at all until 2026-11-16, so nothing could falsify a change to it; and it failed open on
// a `.env` line it did not recognise, which is the case the last describe here pins.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { envValues, isLocalHost, unsafeDataUrls } from '../scripts/lib/data-url.ts';

describe('a host that is this machine', () => {
  it('is localhost, a loopback address, or a local socket', () => {
    for (const h of ['localhost', 'LOCALHOST', '', '127.0.0.1', '127.1.2.3', '::1', '[::1]', '::ffff:127.0.0.1']) expect(isLocalHost(h), h).toBe(true);
  });

  it('is never another machine, a private address, or a bracket around what is not IPv6', () => {
    for (const h of ['example.com', 'db.prod.example.com', '10.0.0.4', '192.168.1.10', '0.0.0.0', '::2', '[127.0.0.1]', '[localhost]', 'fe80::1%eth0']) expect(isLocalHost(h), h).toBe(false);
  });
});

describe('a data URL the gate reads', () => {
  it('proves a local destination local, whatever the scheme', () => {
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres://app:secret@127.0.0.1:5432/app' })).toEqual([]);
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres://localhost/app' })).toEqual([]);
    expect(unsafeDataUrls({ DB: 'file:./dev.db' })).toEqual([]);
    expect(unsafeDataUrls({ DB: 'sqlite:///tmp/app.db' })).toEqual([]);
  });

  it('names a remote destination, and says so for a value whose host it cannot read', () => {
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres://app@db.prod.example.com:5432/app' })).toEqual(['DATABASE_URL → db.prod.example.com']);
    // A password may hold an @, a / or a #; every reading is taken and one that is not this machine decides.
    expect(unsafeDataUrls({ DATABASE_URL: 'app:pa/ss@db.prod.example.com:5432/app' })).toEqual(['DATABASE_URL → db.prod.example.com']);
    // A libpq line has no host this can read, so it is refused rather than skipped.
    expect(unsafeDataUrls({ DATABASE_URL: 'host=db.prod.example.com user=app' })[0]).toMatch(/cannot be read/);
  });

  it('reads a postgres URL\'s own host and hostaddr over the defaults', () => {
    // A default hostaddr is a destination a driver may use instead of the URL's host, so a remote one is refused even
    // when the URL names loopback; a local one changes nothing.
    expect(unsafeDataUrls({ DB: 'postgres://127.0.0.1/app' }, { PGHOSTADDR: '10.0.0.4' })).toEqual(['DB → 10.0.0.4']);
    expect(unsafeDataUrls({ DB: 'postgres://127.0.0.1/app' }, { PGHOSTADDR: '127.0.0.1' })).toEqual([]);
    expect(unsafeDataUrls({ DB: 'postgres://127.0.0.1/app?hostaddr=10.0.0.4' })).toHaveLength(1);
    // A service may supply an address that cannot be inspected.
    expect(unsafeDataUrls({ DB: 'postgres:///app' }, { PGSERVICE: 'prod' })).toHaveLength(1);
  });

  it('reads an empty value as no backend at all', () => {
    expect(unsafeDataUrls({ DATABASE_URL: '' })).toEqual([]);
  });
});

// The gate reads the `.env` files itself. Its reader skipped every line it did not recognise, and Next's parser accepts
// forms it did not: a backend named on such a line was a backend the presses reached with the gate never seeing it.
describe('a .env file the gate reads', () => {
  it('reads NAME=value and dotenv\'s own export NAME=value, and unquotes a quoted value', () => {
    expect(envValues('A=1\n\nexport B="two"\n# a comment\nC=\'three\'\n')).toEqual({
      values: { A: '1', B: 'two', C: 'three' },
      unreadable: [],
    });
  });

  it('names the line it cannot read instead of skipping it', () => {
    expect(envValues('A=1\nDATABASE_URL: postgres://db.prod.example.com/app\n')).toEqual({ values: { A: '1' }, unreadable: [2] });
  });
});

// The reader now names what it cannot read; the gate is what must act on that, so the wiring is pinned too.
describe('the gate acting on an unreadable line', () => {
  const SOURCE = fs.readFileSync(path.join(path.resolve(import.meta.dirname, '..'), 'scripts/browser.ts'), 'utf8');

  it('refuses the presses rather than skipping the line, unless the person took that responsibility', () => {
    expect(SOURCE).toContain('const { values: fromFiles, unreadable } = envFiles();');
    expect(SOURCE).toContain('if (unreadable.length && !config.allowRemoteData)');
    expect(SOURCE).toContain('a .env line this gate cannot read');
  });
});
