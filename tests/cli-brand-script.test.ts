// @vitest-environment node
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
/** Every scratch folder this file made: each is removed once, after the file's tests. */
const made: string[] = [];
/**
 * A copy of the template to brand in: its `scripts`, `src`, `tokens` and `package.json`, with the repository's
 * `node_modules` linked in. Each state that writes gets its own, so the states can be run side by side and none of
 * them restores anything for another. Asynchronous, so a copy is made while another state's command runs.
 */
async function copyOf(prefix: string): Promise<string> {
  const c = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  for (const d of ['scripts', 'src', 'tokens']) await fsp.cp(path.join(ROOT, d), path.join(c, d), { recursive: true });
  await fsp.copyFile(path.join(ROOT, 'package.json'), path.join(c, 'package.json'));
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(c, 'node_modules'));
  made.push(c);
  return c;
}
afterAll(() => { for (const c of made) fs.rmSync(c, { recursive: true, force: true }); });

type Run = { failed: boolean; stderr: string };
type Config = Record<string, unknown>;
const readIn = (cwd: string, p: string) => fs.readFileSync(path.join(cwd, p), 'utf8');
/** Run a script in `cwd` and report how it ended, without throwing: a refusal is a result here, not an error. */
const runIn = (cwd: string, file: string, args: string[] = []) => new Promise<{ failed: boolean; stdout: string; stderr: string }>((resolve) => {
  execFile(process.execPath, [file, ...args], { cwd, encoding: 'utf8' }, (error, stdout, stderr) => resolve({ failed: Boolean(error), stdout: String(stdout ?? ''), stderr: String(stderr ?? '') }));
});
const brandIn = async (cwd: string, ...a: string[]): Promise<Run> => {
  const r = await runIn(cwd, 'scripts/brand.ts', a);
  return { failed: r.failed, stderr: r.stderr };
};
/** The product configuration a copy's `src/app.config.ts` exports, as the app reads it. */
const configIn = (cwd: string) => new Promise<Config>((resolve, reject) => {
  execFile(process.execPath, ['--input-type=module', '-e', `import { app } from ${JSON.stringify(pathToFileURL(path.join(cwd, 'src/app.config.ts')).href)}; console.log(JSON.stringify(app));`], { cwd, encoding: 'utf8' }, (error, stdout) => (error ? reject(error) : resolve(JSON.parse(stdout) as Config)));
});
/** Run the file's work a few at a time: every task is a child process, and no two share a copy. */
async function pool<T>(tasks: (() => Promise<T>)[], width = 8): Promise<T[]> {
  const out = new Array<T>(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(width, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++;
      out[i] = await tasks[i]();
    }
  }));
  return out;
}

const MISSING = ['--name', '--workspace', '--timezone', '--package', '--accent', '--theme', '--currency', '--user', '--role', '--hex', '--hue', '--chroma', '--accent-name'];
const UNSAFE = ['/../../../../escaped', '../escape', 'a/b', "owner's", '.', ''];

type Results = {
  /** The refusals that write nothing, run together on one read-only copy. */
  refusals: Record<string, Run>;
  unchanged: { config: boolean; resolver: boolean; tokens: boolean };
  missing: Record<string, Run>;
  unsafe: Record<string, { stderr: string; config: boolean; packageFile: boolean; tokensEmpty: boolean; escaped: boolean }>;
  accent: { run: Run; preferences: boolean };
  accentName: { run: Run; hue: unknown; accent: unknown };
  stepped: { run: Run; accentL: number; contrast: string };
  crashed: { failed: boolean; stderr: string };
  names: { runs: Run[]; first: Config; second: Config };
  quoted: { runs: Run[]; both: Config; role: Config; user: Config };
  product: { run: Run; axe: unknown; vitest: unknown; registry: unknown; suite: boolean; installed: boolean };
};

/**
 * Every run the cases below read, made once for the file: each state that writes gets its own copy of the template, so
 * they run together and no case restores anything for the next, and the refusals share one copy because a refused
 * command writes nothing. The cases only assert on these results.
 */
async function everyRun(): Promise<Results> {
  // The read-only copy: five refusals and the thirteen missing-value refusals, none of which writes.
  const shared = await copyOf('zz-brand-');
  const before = { config: readIn(shared, 'src/app.config.ts'), resolver: readIn(shared, 'tokens/zz-meridian.resolver.json'), tokens: fs.readdirSync(path.join(shared, 'tokens')).sort() };
  const refusalArgs: Record<string, string[]> = {
    theme: ['--existing', '--theme', 'blue'],
    timezone: ['--existing', '--timezone', 'Not/AZone'],
    presetColour: ['--existing', '--accent', 'jade', '--hex', '#E4572E'],
    timezoneFirst: ['--existing', '--name', 'Uncommitted name', '--workspace', 'Uncommitted workspace', '--timezone', 'Not/AZone'],
    followingFlag: ['--existing', '--name', '--theme', 'dark'],
  };
  const refusals: Record<string, Run> = {};
  const missing: Record<string, Run> = {};
  const unsafe: Results['unsafe'] = {};
  const tasks: (() => Promise<void>)[] = [];
  /** The states that brand more than once: started first so their longer chains overlap the refusals' single runs. */
  const slow: (() => Promise<void>)[] = [];

  for (const [key, args] of Object.entries(refusalArgs)) tasks.push(async () => { refusals[key] = await brandIn(shared, ...args); });
  for (const flag of MISSING) tasks.push(async () => { missing[flag] = await brandIn(shared, '--existing', '--name', 'Uncommitted name', flag); });

  // An unsafe accent id is checked before any write, in a deep scratch project of the case's own: even an unfixed
  // command could only escape into it.
  for (const id of UNSAFE) {
    tasks.push(async () => {
      const owned = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-brand-unsafe-'));
      made.push(owned);
      const deep = path.join(owned, 'a/b/c/project');
      fs.mkdirSync(deep, { recursive: true });
      for (const p of ['scripts/brand.ts', 'scripts/lib/args.ts', 'src/lib/color.ts', 'src/app.config.ts', 'package.json']) {
        fs.mkdirSync(path.dirname(path.join(deep, p)), { recursive: true });
        fs.copyFileSync(path.join(shared, p), path.join(deep, p));
      }
      fs.mkdirSync(path.join(deep, 'tokens'));
      const configBefore = readIn(deep, 'src/app.config.ts');
      const packageBefore = readIn(deep, 'package.json');
      const run = await brandIn(deep, '--name', 'Uncommitted name', '--hue', '25', '--accent-name', id);
      unsafe[id] = {
        stderr: run.stderr,
        config: readIn(deep, 'src/app.config.ts') === configBefore,
        packageFile: readIn(deep, 'package.json') === packageBefore,
        tokensEmpty: fs.readdirSync(path.join(deep, 'tokens')).length === 0,
        escaped: fs.existsSync(path.join(owned, 'a/b/escaped.tokens.json')),
      };
    });
  }

  let accent = { run: { failed: false, stderr: '' } as Run, preferences: false };
  slow.push(async () => {
    const c = await copyOf('zz-brand-accent-');
    const preferences = readIn(c, 'src/lib/preferences.ts');
    accent = { run: await brandIn(c, '--existing', '--hue', '25', '--chroma', '0.16'), preferences: readIn(c, 'src/lib/preferences.ts') === preferences };
  });

  let accentName = { run: { failed: false, stderr: '' } as Run, hue: undefined as unknown, accent: undefined as unknown };
  slow.push(async () => {
    const c = await copyOf('zz-brand-name-');
    const run = await brandIn(c, '--existing', '--hue', '25', '--accent-name', 'Brand_2-blue');
    const token = JSON.parse(readIn(c, 'tokens/accent.Brand_2-blue.tokens.json')) as { accent: Record<string, { $value: unknown }> };
    accentName = { run, hue: token.accent['accent-h'].$value, accent: (await configIn(c)).accent };
  });

  let stepped = { run: { failed: false, stderr: '' } as Run, accentL: 1, contrast: '' };
  slow.push(async () => {
    const c = await copyOf('zz-brand-step-');
    const run = await brandIn(c, '--existing', '--hex', '#0E8A5F', '--accent-name', 'stepped');
    const t = JSON.parse(readIn(c, 'tokens/accent.stepped.tokens.json')) as { $extensions: Record<string, { overrides: Record<string, Record<string, number>> }> };
    const contrast = await runIn(c, 'scripts/contrast.ts');
    stepped = { run, accentL: t.$extensions['dev.zz.meridian'].overrides.dark['accent-l'], contrast: contrast.stdout };
  });

  // A contrast run that printed no summary did not measure anything; its empty output used to look like "nothing
  // failed". The copy is this case's own, so breaking its contrast script disturbs no other run.
  let crashed = { failed: false, stderr: '' };
  slow.push(async () => {
    const c = await copyOf('zz-brand-crash-');
    fs.writeFileSync(path.join(c, 'scripts/contrast.ts'), 'console.log("the palette did not load");\nprocess.exit(2);\n');
    crashed = await brandIn(c, '--existing', '--hue', '200', '--chroma', '0.15', '--accent-name', 'unchecked');
  });

  let names = { runs: [] as Run[], first: {} as Config, second: {} as Config };
  slow.push(async () => {
    const c = await copyOf('zz-brand-names-');
    const first = await brandIn(c, '--existing', '--name', "Owner's Desk", '--workspace', "Team's Space");
    const firstConfig = await configIn(c);
    const second = await brandIn(c, '--existing', '--name', "O'Neil's New Desk", '--workspace', 'Updated space');
    names = { runs: [first, second], first: firstConfig, second: await configIn(c) };
  });

  let quoted = { runs: [] as Run[], both: {} as Config, role: {} as Config, user: {} as Config };
  slow.push(async () => {
    const c = await copyOf('zz-brand-quoted-');
    const runs: Run[] = [];
    runs.push(await brandIn(c, '--existing', '--user', "Ada O'Neil", '--role', "Team's Owner"));
    const both = await configIn(c);
    runs.push(await brandIn(c, '--existing', '--role', "Reviewer's Admin"));
    const role = await configIn(c);
    runs.push(await brandIn(c, '--existing', '--user', "Mia D'Angelo"));
    quoted = { runs, both, role, user: await configIn(c) };
  });

  // --product turns the template into a dashboard on a copy holding only what it reads.
  let product = { run: { failed: false, stderr: '' } as Run, axe: undefined as unknown, vitest: undefined as unknown, registry: undefined as unknown, suite: true, installed: false };
  slow.push(async () => {
    const p = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-product-'));
    made.push(p);
    for (const d of ['scripts', 'tokens']) await fsp.cp(path.join(ROOT, d), path.join(p, d), { recursive: true });
    for (const d of ['src/lib', 'src/styles', 'tests']) await fsp.mkdir(path.join(p, d), { recursive: true });
    for (const f of ['src/app.config.ts', 'src/lib/color.ts', 'package.json', 'pnpm-lock.yaml', 'AGENTS.md', 'next.config.ts']) await fsp.copyFile(path.join(ROOT, f), path.join(p, f));
    await fsp.writeFile(path.join(p, 'tests/cards-contract.test.tsx'), "// Meridian's own card contract suite.\n");
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(p, 'node_modules'));
    const run = await brandIn(p, '--product');
    const pkg = JSON.parse(fs.readFileSync(path.join(p, 'package.json'), 'utf8')) as { devDependencies: Record<string, string>; scripts: Record<string, string> };
    const installed = await new Promise<boolean>((resolve) => execFile('pnpm', ['install', '--frozen-lockfile', '--lockfile-only', '--offline'], { cwd: p, env: { ...process.env, CI: 'true' } }, (error) => resolve(!error)));
    product = { run, axe: pkg.devDependencies['axe-core'], vitest: pkg.devDependencies.vitest, registry: pkg.scripts.registry, suite: fs.existsSync(path.join(p, 'tests/cards-contract.test.tsx')), installed };
  });

  await pool([...slow, ...tasks], 10);

  // The refusals ran together and none of them writes: the copy is as it was.
  return {
    refusals,
    unchanged: {
      config: readIn(shared, 'src/app.config.ts') === before.config,
      resolver: readIn(shared, 'tokens/zz-meridian.resolver.json') === before.resolver,
      tokens: JSON.stringify(fs.readdirSync(path.join(shared, 'tokens')).sort()) === JSON.stringify(before.tokens),
    },
    missing,
    unsafe,
    accent,
    accentName,
    stepped,
    crashed,
    names,
    quoted,
    product,
  };
}

let R: Results;
beforeAll(async () => { R = await everyRun(); }, 600_000);

describe('scripts/brand.ts', () => {
  it('adds a brand accent without patching preferences.ts', () => {
    expect(R.accent.run.failed).toBe(false);
    expect(R.accent.preferences).toBe(true);
  });
  it('accepts a filename-safe custom accent name', () => {
    expect(R.accentName.run.failed).toBe(false);
    expect(R.accentName.hue).toBe(25);
    expect(R.accentName.accent).toBe('Brand_2-blue');
  });
  it.each(UNSAFE)('rejects unsafe accent id %j before any write', (id) => {
    const r = R.unsafe[id];
    expect(r.stderr).toMatch(/--accent-name uses only/);
    expect(r.config).toBe(true);
    expect(r.packageFile).toBe(true);
    expect(r.tokensEmpty).toBe(true);
    expect(r.escaped).toBe(false);
  });
  it('keeps the step that fixed a failing accent, and does not refuse it with the failure before it', () => {
    // #0E8A5F fails white on its dark fill at the start and passes one step darker; the command refused it with the
    // first step's failure, which no longer held.
    expect(R.stepped.run.failed).toBe(false);
    expect(R.stepped.accentL).toBeLessThan(0.56);
    expect(R.stepped.contrast).not.toMatch(/FAIL.* stepped /);
  });
  it('refuses a brand it could not check, instead of reading a crashed contrast run as no failures', () => {
    expect(R.crashed.failed).toBe(true);
    expect(R.crashed.stderr).toMatch(/did not run to its summary/);
  });
  it('refuses any other theme', () => {
    expect(R.refusals.theme.stderr).toMatch(/theme/i);
    expect(R.unchanged.config).toBe(true);
    expect(R.unchanged.tokens).toBe(true);
  });
  it('rebrands complete names and workspaces that already contain apostrophes', () => {
    expect(R.names.runs.every((r) => !r.failed)).toBe(true);
    expect(R.names.first).toMatchObject({ name: "Owner's Desk", workspace: "Team's Space" });
    expect(R.names.second).toMatchObject({ name: "O'Neil's New Desk", workspace: 'Updated space' });
  });
  it('preserves an already quoted user or role when changing only the other', () => {
    expect(R.quoted.runs.every((r) => !r.failed)).toBe(true);
    expect(R.quoted.both.user).toEqual({ name: "Ada O'Neil", role: "Team's Owner" });
    expect(R.quoted.role.user).toEqual({ name: "Ada O'Neil", role: "Reviewer's Admin" });
    expect(R.quoted.user.user).toEqual({ name: "Mia D'Angelo", role: "Reviewer's Admin" });
  });
  it('refuses a timezone the product cannot render without changing the current zone', () => {
    expect(R.refusals.timezone.failed).toBe(true);
    expect(R.unchanged.config).toBe(true);
  });
  it('refuses a preset and a colour together before writing either', () => {
    expect(R.refusals.presetColour.failed).toBe(true);
    expect(R.refusals.presetColour.stderr).toMatch(/one or the other/);
    expect(R.unchanged.config).toBe(true);
    expect(R.unchanged.resolver).toBe(true);
  });
  it('validates the timezone before applying other requested configuration changes', () => {
    expect(R.refusals.timezoneFirst.failed).toBe(true);
    expect(R.unchanged.config).toBe(true);
  });
  it.each(MISSING)('refuses missing %s values before applying another option', (flag) => {
    expect(R.missing[flag].failed).toBe(true);
    // The refusal is before the writes it would otherwise have applied with the other option.
    expect(R.unchanged.config).toBe(true);
  });
  it('rejects a following known flag instead of treating it as the product name', () => {
    expect(R.refusals.followingFlag.failed).toBe(true);
    expect(R.unchanged.config).toBe(true);
  });
  it("leaves Meridian's own test engine out of the product it brands", () => {
    // --product turns the template into a dashboard: the card contract suite and the previews it reads go, and with them
    // the accessibility engine only that suite uses.
    expect(R.product.run.failed).toBe(false);
    expect(R.product.axe).toBeUndefined();
    // Only the engine goes: the toolchain the project keeps its own tests with stays.
    expect(R.product.vitest).toBeDefined();
    expect(R.product.registry).toBeUndefined();
    // The suite that reads the deleted previews and registry goes with them, rather than failing in the product.
    expect(R.product.suite).toBe(false);
    // A product installs where CI freezes the lockfile, which refuses a manifest its lockfile does not match: the
    // removed devDependency has to leave the lockfile too, or `create` cannot install the dashboard it just made.
    expect(R.product.installed).toBe(true);
  });
});
