// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dataHost, isLocalHost } from '../scripts/lib/data-url.ts';

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
});
