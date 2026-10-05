// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assertSafeEntries, fetchRelease, replay } from '../cli/src/replay.ts';

const tmp: string[] = [];
const dir = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-replay-')); tmp.push(d); return d; };
afterEach(() => { for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });

describe('fetchRelease', () => {
  it.each(['latest', '0.3', '0.3.0;rm -rf /', '../0.3.0', ''])('refuses the version %j before running anything', (v) => {
    expect(() => fetchRelease(v, dir())).toThrow(/version/);
  });
});

describe('assertSafeEntries', () => {
  it('accepts a normal package', () => expect(() => assertSafeEntries(['package/package.json', 'package/dist/cli.js', 'package/payload/src/lib/cn.ts'])).not.toThrow());
  it.each([['/etc/passwd'], ['package/../evil'], ['../evil'], ['other/file'], ['package/payload/../../x']])('refuses %s', (e) => {
    expect(() => assertSafeEntries(['package/package.json', e])).toThrow();
  });
});

describe('replay', () => {
  // A stub package: its cli.js records its own argv and writes two files, as a real adopt or create would.
  const stub = () => {
    const root = dir();
    fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
    fs.mkdirSync(path.join(root, 'payload'), { recursive: true });
    fs.writeFileSync(path.join(root, 'dist/cli.js'), [
      "import fs from 'node:fs'; import path from 'node:path';",
      "const args = process.argv.slice(2); const create = args[0] === 'create';",
      "const out = create ? path.resolve(args[1]) : process.cwd(); fs.mkdirSync(path.join(out, 'src/lib'), { recursive: true });",
      "fs.writeFileSync(path.join(out, 'src/lib/cn.ts'), 'export const cn = 1;\\n');",
      "fs.writeFileSync(path.join(out, 'argv.json'), JSON.stringify(args));",
      "fs.mkdirSync(path.join(out, 'node_modules/x'), { recursive: true }); fs.writeFileSync(path.join(out, 'node_modules/x/i.js'), '');",
    ].join('\n'));
    fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
    return root;
  };
  it('replays adopt in a synthetic Next.js project with the recorded brand', () => {
    const files = replay(stub(), 'adopt', { name: 'Acme Ops', hex: '#2E6BE4' }, dir());
    expect(files.get('src/lib/cn.ts')).toMatch(/^sha256-[0-9a-f]{64}$/);
    expect([...files.keys()].some((k) => k.startsWith('node_modules/'))).toBe(false);
    expect(files.has('package.json') && files.has('app/layout.tsx') && files.has('tsconfig.json')).toBe(true);
  });
  it('passes adopt --allow-dirty --no-install and the brand flags', () => {
    const scratch = dir();
    replay(stub(), 'adopt', { name: 'Acme Ops', hex: '#2E6BE4' }, scratch);
    const argv = JSON.parse(fs.readFileSync(path.join(scratch, fs.readdirSync(scratch).find((d) => fs.existsSync(path.join(scratch, d, 'argv.json')))!, 'argv.json'), 'utf8'));
    expect(argv[0]).toBe('adopt');
    expect(argv).toEqual(expect.arrayContaining(['--allow-dirty', '--no-install', '--name', 'Acme Ops', '--hex', '#2E6BE4']));
  });
  it('replays create into an empty folder', () => {
    const files = replay(stub(), 'create', { name: 'Acme Ops' }, dir());
    expect(files.has('src/lib/cn.ts')).toBe(true);
    expect(files.has('app/layout.tsx')).toBe(false);
  });
});
