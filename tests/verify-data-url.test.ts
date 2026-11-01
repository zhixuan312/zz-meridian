// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dataHost, isLocalHost, unsafeDataUrls } from '../scripts/lib/data-url.ts';

/**
 * `scripts/verify.ts` refuses a data URL that is not on this machine before it builds anything, because the presses and
 * the walk-throughs write. An unreadable host, an unproven DNS name or another driver's query options must not make a
 * remote backend appear local.
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
    for (const value of ['localhost:5432/app', 'postgres://u:p@localhost:5432/app', 'postgres://localhost/app', '127.0.0.1:5432']) {
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
    expect(unsafeDataUrls({ DATABASE_URL: '', OTHER: 'localhost:5432' })).toEqual([]);
    // And a run that knows what its presses reach says so in the config, never here.
    expect(unsafeDataUrls({ DATABASE_URL: 'db.prod.example.com/app' })).toEqual(['DATABASE_URL → db.prod.example.com']);
  });

  it('calls a remote IPv6 address remote, and only the loopback local', () => {
    for (const value of ['postgres://u:p@[2001:db8::1]:5432/app', '[2001:db8::1]:5432/app', 'postgres://[fd00::10]/app']) {
      expect(unsafeDataUrls({ DATABASE_URL: value }), value).toHaveLength(1);
    }
    for (const value of ['postgres://u:p@[::1]:5432/app', '[::1]:5432/app']) expect(unsafeDataUrls({ DATABASE_URL: value }), value).toEqual([]);
  });

  it('reads a schemeless value whose query holds an @ by its own host, not by the word after the @', () => {
    expect(unsafeDataUrls({ DATABASE_URL: 'db.prod.example.com:5432/app?application_name=svc@web' })).toEqual(['DATABASE_URL → db.prod.example.com']);
    expect(unsafeDataUrls({ DATABASE_URL: 'localhost:5432/app?application_name=svc@web' })).toEqual([]);
  });

  it('reads the host of a schemeless value whose password holds a / or a #', () => {
    // Cutting at the path before the credentials go cuts inside the password rather than reading the actual host.
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
    for (const value of ['file:./dev.db', 'file:/var/data/app.db', 'sqlite:///tmp/app.db', 'sqlite:./x']) {
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
    // An explicit Unix socket or loopback host is local; missing or empty network hosts need connection defaults.
    for (const value of ['postgres:///app?host=/var/run/postgresql', 'postgres:///app?host=localhost']) {
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

  it('refuses unproven DNS names and strings that only resemble loopback literals', () => {
    for (const host of ['db', 'prod-db', 'postgres', '127.prod.example', '127.0.0.1.example', '127.999.1.1', '0.0.0.0']) {
      expect(isLocalHost(host), host).toBe(false);
      expect(unsafeDataUrls({ DATABASE_URL: `postgres://${host}/app` }), host).toHaveLength(1);
    }
  });

  it('accepts genuine IPv4 and IPv6 loopback literals, including mapped and expanded forms', () => {
    for (const host of ['127.0.0.1', '127.25.1.2', '::1', '0:0:0:0:0:0:0:1', '::ffff:127.0.0.1', '::ffff:7f00:1']) {
      expect(isLocalHost(host), host).toBe(true);
    }
    for (const host of ['::ffff:128.0.0.1', '::ffff:127.invalid', '2001:db8::1']) expect(isLocalHost(host), host).toBe(false);
  });

  it('does not give non-PostgreSQL query options libpq authority-override semantics', () => {
    for (const scheme of ['mysql', 'redis', 'mongodb', 'libsql', 'file']) {
      for (const query of ['host=localhost', 'hostaddr=127.0.0.1']) {
        const value = `${scheme}://db.prod.example/app?${query}`;
        expect(dataHost(value), value).toBe('db.prod.example');
        expect(unsafeDataUrls({ DATABASE_URL: value }), value).toEqual(['DATABASE_URL → db.prod.example']);
      }
    }
  });
  it('checks remote failover hosts even when a Unix socket is listed first', () => {
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres://localhost/app?host=%2Ftmp%2Cprod.example' }))
      .toEqual(['DATABASE_URL → prod.example']);
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres://prod.example/app?host=%2Ftmp%2C%2Fvar%2Frun%2Fpostgresql' }))
      .toEqual([]);
  });

  it('does not treat an environment-default network host as proven local', () => {
    for (const value of ['postgres:///app', 'postgres://localhost/app?host=', 'redis:///0']) {
      expect(dataHost(value), value).toBeNull();
    }
  });

  it.each(['[localhost]', '127.0.0.1]', '::1%lo0'])('refuses an unproven host literal %s without throwing', (host) => {
    expect(isLocalHost(host)).toBe(false);
  });
  it('uses PostgreSQL connection defaults without letting them hide a remote address', () => {
    const remote = { PGHOSTADDR: '203.0.113.7' };
    expect(dataHost('postgres://localhost/app', remote)).toBe('203.0.113.7');
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres://localhost/app' }, remote))
      .toEqual(['DATABASE_URL → 203.0.113.7']);
    expect(dataHost('postgres://prod.example/app?hostaddr=127.0.0.1', remote)).toBe('prod.example');
    expect(dataHost('postgres://localhost/app?hostaddr=127.0.0.1', remote)).toBe('127.0.0.1');
    expect(dataHost('postgres:///app', { PGHOST: 'localhost' })).toBe('localhost');
    expect(dataHost('postgres://localhost/app', { PGSERVICE: 'uninspected-service' })).toBeNull();
  });
  it('does not let environment fallback addresses hide an uninspected service', () => {
    const defaults = { PGHOSTADDR: '127.0.0.1', PGSERVICE: 'uninspected-service' };
    expect(dataHost('postgres://localhost/app', defaults)).toBeNull();
    expect(dataHost('postgres://localhost/app?service=other', defaults)).toBeNull();
    expect(dataHost('postgres://localhost/app?hostaddr=127.0.0.1', defaults)).toBe('127.0.0.1');
  });
  it.each([
    ['postgres://203.0.113.7/app?hostaddr=127.0.0.1', {}, '203.0.113.7'],
    ['postgres://localhost/app?host=prod.example&hostaddr=127.0.0.1', {}, 'prod.example'],
    ['postgres:///app?hostaddr=127.0.0.1', { PGHOST: 'prod.example' }, 'prod.example'],
  ])('does not let hostaddr hide the host used by drivers that ignore it: %s', (url, defaults, host) => {
    expect(unsafeDataUrls({ DATABASE_URL: url }, defaults)).toEqual([`DATABASE_URL → ${host}`]);
  });
  it('refuses an empty host override even when a loopback hostaddr is supplied', () => {
    expect(dataHost('postgres://prod.example/app?host=&hostaddr=127.0.0.1')).toBeNull();
  });
  it('does not classify an abstract-socket name as a portable local transport', () => {
    expect(unsafeDataUrls({ DATABASE_URL: 'postgres:///app?host=%40owned-abstract' }))
      .toEqual(['DATABASE_URL → @owned-abstract']);
  });
});
