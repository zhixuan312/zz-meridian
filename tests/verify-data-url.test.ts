// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dataHost, isLocalHost, unsafeDataUrls } from '../scripts/lib/data-url.ts';

/**
 * `scripts/verify.ts` refuses a data URL that is not on this machine before it builds anything, because the presses and
 * the walk-throughs write. A value it cannot read the host of used to be read as *this* machine: `new URL()` gives an
 * empty hostname for a value written without a scheme, and an empty host is a name with no dot, which is local. A
 * remote DSN was therefore judged local and the presses would have run against it.
 */
describe('where a data URL points', () => {
  it('reads the authority of a value written without a scheme', () => {
    expect(dataHost('db.prod.example.com:5432/app')).toBe('db.prod.example.com');
    expect(dataHost('localhost:5432/app')).toBe('localhost');
    expect(dataHost('postgres:5432')).toBe('postgres');
  });

  it('reads the host of a proper URL, and of a value it cannot read at all', () => {
    expect(dataHost('postgres://u:p@db.prod.example.com:5432/app')).toBe('db.prod.example.com');
    expect(dataHost('postgres://u:p@localhost:5432/app')).toBe('localhost');
    // Bracketed, as it is written; `isLocalHost` strips the brackets before it compares.
    expect(dataHost('[::1]:5432/app')).toBe('[::1]');
    expect(isLocalHost(dataHost('[::1]:5432/app')!)).toBe(true);
    expect(dataHost('not a url')).toBeNull();
  });

  it('calls a remote backend remote, however it is written', () => {
    for (const value of ['db.prod.example.com:5432/app', 'postgres://u:p@db.prod.example.com:5432/app', 'db.prod.example.com', '10.20.30.40:5432/app', 'db.prod.example.com/app']) {
      const host = dataHost(value);
      expect(host, value).not.toBeNull();
      expect(isLocalHost(host!), value).toBe(false);
    }
  });

  it('still calls a backend on this machine local, however it is written', () => {
    for (const value of ['localhost:5432/app', 'postgres://u:p@localhost:5432/app', 'postgres:5432', 'postgres://localhost/app', '127.0.0.1:5432']) {
      const host = dataHost(value);
      expect(host, value).not.toBeNull();
      expect(isLocalHost(host!), value).toBe(true);
    }
  });

  it('calls a schemeless value with credentials remote, not unreadable', () => {
    // The case the gate failed open on: the authority is the whole `user:pass@host`, the `@` is not host-shaped, and a
    // null is a value `unsafeBackend` skipped — so the presses ran against it.
    expect(dataHost('user:pass@db.prod.example.com:5432/app')).toBe('db.prod.example.com');
    expect(isLocalHost(dataHost('user:pass@db.prod.example.com:5432/app')!)).toBe(false);
    expect(dataHost('u:p@localhost:5432/app')).toBe('localhost');
    expect(isLocalHost(dataHost('u:p@localhost:5432/app')!)).toBe(true);
  });

  it('refuses a value it cannot read the host of, rather than skipping it', () => {
    // A libpq line is a real DSN shape with no host this can read; a press against it lands wherever it points.
    expect(unsafeDataUrls({ DATABASE_URL: 'host=db.prod.example.com user=ops' })).toEqual(['DATABASE_URL → a value whose host cannot be read']);
    expect(unsafeDataUrls({ DATABASE_URL: 'user:pass@db.prod.example.com:5432/app' })).toEqual(['DATABASE_URL → db.prod.example.com']);
    // What a local run looks like, and what names no backend at all.
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres://u:p@localhost:5432/app' })).toEqual([]);
    expect(unsafeDataUrls({ DATABASE_URL: '', OTHER: 'postgres:5432' })).toEqual([]);
    // And a run that knows what its presses reach says so in the config, never here.
    expect(unsafeDataUrls({ DATABASE_URL: 'db.prod.example.com/app' })).toEqual(['DATABASE_URL → db.prod.example.com']);
  });
});
