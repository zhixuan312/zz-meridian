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

  it('reads the host of a schemeless value whose password holds a / or a #', () => {
    // Cutting at the path before the credentials go cuts inside the password: the host read as `user:pa`, a name with no
    // dot, which `isLocalHost` calls local — a remote backend the gate let through.
    expect(dataHost('user:pa/ss@db.prod.example.com:5432/app')).toBe('db.prod.example.com');
    expect(dataHost('user:pa#ss@db.prod.example.com:5432/app')).toBe('db.prod.example.com');
    expect(dataHost('user:p@ss@db.prod.example.com:5432/app')).toBe('db.prod.example.com');
    for (const value of ['user:pa/ss@db.prod.example.com:5432/app', 'user:pa#ss@db.prod.example.com:5432/app']) {
      expect(unsafeDataUrls({ DATABASE_URL: value }), value).toEqual(['DATABASE_URL → db.prod.example.com']);
    }
  });

  it('calls a value that names a file of this machine local, however its scheme is written', () => {
    // `file:./dev.db` is Prisma's SQLite default. Reading it by hand gave `file:.` — a name with a dot, so remote — and
    // an adopter's `verify --full` was refused with a reason that says nothing about their machine.
    for (const value of ['file:./dev.db', 'file:/var/data/app.db', 'sqlite:///tmp/app.db', 'sqlite:./x', 'postgres:///app']) {
      expect(dataHost(value), value).not.toBeNull();
      expect(isLocalHost(dataHost(value)!), value).toBe(true);
      expect(unsafeDataUrls({ DATABASE_URL: value }), value).toEqual([]);
    }
  });

  it('reads a host named in the query string, which libpq lets decide over the authority', () => {
    // `postgres:///app?host=…` is a real DSN shape: the authority is empty and libpq takes the host from the query, so
    // reading only the authority called a production database local and the presses would have run against it.
    expect(dataHost('postgres:///app?host=db.prod.example.com')).toBe('db.prod.example.com');
    expect(dataHost('postgresql:///app?host=10.0.0.5&port=5432')).toBe('10.0.0.5');
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres:///app?host=db.prod.example.com' })).toEqual(['DATABASE_URL → db.prod.example.com']);
    expect(unsafeDataUrls({ DATABASE_URL: 'postgresql:///app?host=10.0.0.5&port=5432' })).toEqual(['DATABASE_URL → 10.0.0.5']);
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres:///app?hostaddr=db.prod.example.com' })).toEqual(['DATABASE_URL → db.prod.example.com']);
    // Both given: libpq dials `hostaddr` and uses `host` to look the name up, so the address decides.
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres:///app?host=localhost&hostaddr=10.20.30.40' })).toEqual(['DATABASE_URL → 10.20.30.40']);
    // Given twice, libpq keeps the last value (`conninfo_uri_parse_params` stores over the one before), so reading the
    // first would call this remote `localhost` — and the other way round is this machine, which is what it dials.
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres:///app?host=localhost&host=db.prod.example.com' })).toEqual(['DATABASE_URL → db.prod.example.com']);
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres:///app?host=db.prod.example.com&host=localhost' })).toEqual([]);
    // A path is a Unix socket, and a query naming no host at all names this machine.
    for (const value of ['postgres:///app?host=/var/run/postgresql', 'postgres:///app?host=localhost', 'postgres:///app', 'postgres:///app?host=']) {
      expect(unsafeDataUrls({ DATABASE_URL: value }), value).toEqual([]);
    }
  });

  it('reads the host of a file scheme that names another machine', () => {
    // The file schemes were answered local before the value was read at all: `file://host/share/app.db` is a file on
    // another machine, and `libsql://…` is a database over the network.
    expect(dataHost('file://db.prod.example.com/share/app.db')).toBe('db.prod.example.com');
    expect(unsafeDataUrls({ DATABASE_URL: 'file://db.prod.example.com/share/app.db' })).toEqual(['DATABASE_URL → db.prod.example.com']);
    expect(unsafeDataUrls({ DATABASE_URL: 'libsql://db.prod.example.com/app' })).toEqual(['DATABASE_URL → db.prod.example.com']);
    // And the forms that are this machine's own file stay local.
    for (const value of ['file:./dev.db', 'file:///var/data/app.db', 'file://localhost/share/app.db', 'sqlite:///tmp/app.db', 'libsql:./local.db']) {
      expect(unsafeDataUrls({ DATABASE_URL: value }), value).toEqual([]);
    }
  });

  it('still calls a container name local and a public name remote', () => {
    // The rule the two above lean on: a name with no dot cannot resolve outside this machine's own network.
    expect(isLocalHost(dataHost('postgres://postgres@db:5432/app')!)).toBe(true);
    expect(isLocalHost(dataHost('user:pa#ss@prod-db:5432/app')!)).toBe(true);
    expect(isLocalHost(dataHost('postgres://u:p@db.prod.example.com/app')!)).toBe(false);
  });
});
