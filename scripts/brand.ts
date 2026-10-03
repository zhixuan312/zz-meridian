/**
 * Brand a copy of Meridian for a product, in place.
 *
 *   node scripts/brand.ts --name "Atlas Ops" [--workspace "Production"] [--timezone "Europe/London"]
 *                         [--package atlas-ops] [--accent indigo|cobalt|jade|graphite]
 *                         [--hue 25 --chroma 0.16 [--accent-name brand]] [--no-atlas]
 *
 * --hue/--chroma add a new accent preset (OKLCH hue in degrees, chroma 0 to 0.2) and make it the default. The contrast
 * gate then runs; where white on the accent fill fails in a theme, the preset gets a lower fill lightness for that
 * theme, a step at a time, until every pair in every theme passes. --no-atlas removes the Design Atlas routes and the
 * rail entries that point at them (the card previews stay: the gate checks them).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const opt = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const has = (k: string) => argv.includes(k);
const file = (p: string) => path.join(ROOT, p);
const read = (p: string) => fs.readFileSync(file(p), 'utf8');
const write = (p: string, s: string) => fs.writeFileSync(file(p), s);
const json = (p: string) => JSON.parse(read(p));
const done: string[] = [];

function setConfig(key: string, value: string) {
  const s = read('src/app.config.ts');
  const re = new RegExp(`(\\n  ${key}: )'[^']*'`);
  if (!re.test(s)) throw new Error(`src/app.config.ts has no "${key}"`);
  write('src/app.config.ts', s.replace(re, `$1'${value.replace(/'/g, "\\'")}'`));
  done.push(`${key} = ${value}`);
}

const name = opt('--name');
if (name) setConfig('name', name);
const workspace = opt('--workspace');
if (workspace) setConfig('workspace', workspace);
const timezone = opt('--timezone');
if (timezone) setConfig('timezone', timezone);

const pkg = opt('--package') ?? (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : undefined);
if (pkg) {
  const p = json('package.json');
  p.name = pkg;
  p.version = '0.1.0';
  p.description = `${name ?? pkg}: a dashboard built on Meridian.`;
  write('package.json', JSON.stringify(p, null, 2) + '\n');
  done.push(`package = ${pkg}`);
}

/** Make an accent the default everywhere: the resolver, the app config, and the CSS. */
function defaultAccent(id: string) {
  const r = json('tokens/zz-meridian.resolver.json');
  if (!r.modifiers.accent.contexts[id]) throw new Error(`no accent "${id}"; presets are ${Object.keys(r.modifiers.accent.contexts).join(', ')}`);
  r.modifiers.accent.default = id;
  write('tokens/zz-meridian.resolver.json', JSON.stringify(r, null, 2) + '\n');
  const s = read('src/app.config.ts').replace(/accent: '[^']*' as const/, `accent: '${id}' as const`);
  write('src/app.config.ts', s);
  done.push(`accent = ${id}`);
}

const hue = opt('--hue');
if (hue !== undefined) {
  const h = Number(hue), c = Number(opt('--chroma') ?? '0.16');
  const id = opt('--accent-name') ?? 'brand';
  if (!Number.isFinite(h) || h < 0 || h > 360) throw new Error('--hue is an OKLCH hue in degrees, 0 to 360');
  if (!Number.isFinite(c) || c < 0 || c > 0.24) throw new Error('--chroma is OKLCH chroma, 0 to 0.24 (0.12 to 0.18 is typical)');
  const tokens = {
    $schema: 'https://www.designtokens.org/schemas/2025.10/format.json',
    $description: `Accent preset: ${id}. The product's brand hue.`,
    accent: {
      $description: 'The two numbers a preset owns.',
      'accent-h': { $type: 'number', $value: h, $description: 'Hue, in OKLCH degrees.' },
      'accent-c': { $type: 'number', $value: c, $description: 'Chroma, in OKLCH.' },
    },
    $extensions: { 'dev.zz.meridian': { overrides: { light: {}, dark: {} } as Record<string, Record<string, number>> } },
  };
  const tokenFile = `tokens/accent.${id}.tokens.json`;
  write(tokenFile, JSON.stringify(tokens, null, 2) + '\n');
  const r = json('tokens/zz-meridian.resolver.json');
  r.modifiers.accent.contexts[id] = [{ $ref: `accent.${id}.tokens.json` }];
  write('tokens/zz-meridian.resolver.json', JSON.stringify(r, null, 2) + '\n');
  let prefs = read('src/lib/preferences.ts');
  if (!prefs.includes(`'${id}'`)) {
    prefs = prefs.replace(/export const ACCENTS = \[([^\]]*)\] as const;/, (_, list) => `export const ACCENTS = [${list}, '${id}'] as const;`);
    prefs = prefs.replace(/(export const ACCENT_SWATCH[^{]*\{)([^}]*)\}/, (_, head, body) => `${head} ${body.trim()}, ${id}: 'oklch(0.56 ${c} ${h})' }`);
    write('src/lib/preferences.ts', prefs);
  }
  defaultAccent(id);

  // Hold contrast: lower a theme's fill lightness where white text on it fails, a step at a time.
  const base = { light: 0.52, dark: 0.56 };
  for (let step = 0; step < 8; step++) {
    execFileSync('node', ['scripts/tokens.ts'], { cwd: ROOT, stdio: 'ignore' });
    let out = '';
    try { out = execFileSync('node', ['scripts/contrast.ts'], { cwd: ROOT, encoding: 'utf8' }); break; }
    catch (e: any) { out = String(e.stdout ?? ''); }
    const fails = out.split('\n').filter((l) => l.startsWith('FAIL') && l.includes(` ${id} `));
    if (!fails.length) break;
    const t = JSON.parse(read(tokenFile));
    for (const theme of ['light', 'dark'] as const) {
      if (!fails.some((l) => l.includes(`FAIL ${theme}`) && /on-accent on accent/.test(l))) continue;
      const o = (t.$extensions['dev.zz.meridian'].overrides[theme] ||= {});
      o['accent-l'] = Math.round(((o['accent-l'] ?? base[theme]) - 0.02) * 100) / 100;
      o['accent-l-hover'] = Math.round((o['accent-l'] - 0.05) * 100) / 100;
    }
    write(tokenFile, JSON.stringify(t, null, 2) + '\n');
    if (step === 7) console.log('Contrast still fails for this hue; lower --chroma and run again:\n' + fails.join('\n'));
  }
  done.push(`accent ${id}: hue ${h}, chroma ${c}`);
} else {
  const accent = opt('--accent');
  if (accent) defaultAccent(accent);
}

if (has('--no-atlas')) {
  fs.rmSync(file('app/system'), { recursive: true, force: true });
  const s = read('src/app.config.ts').replace(/\n\s*\{ href: '\/system[^}]*\},/g, '');
  write('src/app.config.ts', s);
  done.push('the Design Atlas removed (app/system and its rail entries); src/system stays for the card previews');
}

execFileSync('node', ['scripts/tokens.ts'], { cwd: ROOT, stdio: 'ignore' });
execFileSync('node', ['scripts/registry.ts'], { cwd: ROOT, stdio: 'ignore' });
console.log(done.length ? 'brand:\n  ' + done.join('\n  ') : 'brand: nothing to change (see the usage at the top of scripts/brand.ts)');
