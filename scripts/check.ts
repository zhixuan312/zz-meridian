/**
 * Consistency gate: the system holds itself to its own contract.
 *
 *   node scripts/check.ts
 *
 * - Every card folder has its README.md and preview.tsx, and every README follows the card anatomy.
 * - Every page specification exists and follows the page anatomy.
 * - Every token a specification names in backticks, and every var(--x) or (--x) a component uses, exists.
 * - No literal colour (hex, rgb, hsl) and no Tailwind default palette in the layers: colours come from roles.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cards } from './registry.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const problems: string[] = [];

function walk(dir: string, ext: RegExp, out: string[] = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const n of fs.readdirSync(abs)) {
    const p = path.join(dir, n);
    if (fs.statSync(path.join(ROOT, p)).isDirectory()) walk(p, ext, out);
    else if (ext.test(n)) out.push(p);
  }
  return out;
}

// ── Tokens that exist ────────────────────────────────────────────────────────────────────────────────
const css = read('src/styles/tokens.css') + read('src/styles/base.css') + read('src/styles/motion.css');
const defined = new Set([...css.matchAll(/--([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
/** Local custom properties a component sets for itself, and the host's bridged variables. */
const LOCAL = /^(i|w|m-len|safe-(top|right|bottom|left)|font-face-(sans|mono)|color-[a-z-]+|border-radius-[a-z]+|tw-.*|radix-.*)$/;

// ── Cards ────────────────────────────────────────────────────────────────────────────────────────────
const CARD_SECTIONS = ['## Surfaces', '## Agents', '## Accessibility'];
for (const c of cards()) {
  if (!c.hasPreview) problems.push(`${c.dir}: no preview.tsx`);
  const md = read(`${c.dir}/README.md`);
  if (!/^# .+\n\n[^#\n].+/.test(md)) problems.push(`${c.dir}/README.md: must open with "# Name" and a one-sentence summary`);
  if (!/^Status: (draft|beta|stable)$/m.test(md)) problems.push(`${c.dir}/README.md: no "Status: draft|beta|stable" line`);
  for (const s of CARD_SECTIONS) if (!md.includes(s)) problems.push(`${c.dir}/README.md: missing ${s}`);
}

// ── Pages ────────────────────────────────────────────────────────────────────────────────────────────
const PAGE_SPECS = walk('app', /^README\.md$/);
for (const p of PAGE_SPECS) {
  const md = read(p);
  if (!/^# .+\n\n[^#\n].+/.test(md)) problems.push(`${p}: must open with "# Name" and a one-sentence summary`);
  for (const s of ['## Structure', '## States']) if (!md.includes(s)) problems.push(`${p}: missing ${s}`);
}

// ── Token names in specifications ────────────────────────────────────────────────────────────────────
const TOKEN_LIKE = /`((?:ground|frame|surface|line|fill|ink|accent|on-accent|on-critical|positive|warning|critical|series|chart|shadow|highlight|glow|edge|text|weight|leading|tracking|space|radius|control|row-height|card-pad|stack-gap|rail|data-width|reading-width|gutter|layer|dur|stagger|ease|stretch)(?:-[a-z0-9-]+)?)`/g;
const NOT_TOKENS = new Set(['leading', 'trailing', 'fill', 'text-wrap', 'text-pretty', 'text-balance', 'line-clamp', 'ease-out', 'ease-in-out', 'ease-spring', 'layer-1', 'text-left', 'text-right', 'text-center', 'surface-sunk/60', 'fill-hover', 'glow', 'edge', 'chart', 'series', 'shadow', 'surface', 'line', 'ink', 'accent', 'frame', 'ground']);
const SPECS = [...cards().map((c) => `${c.dir}/README.md`), ...PAGE_SPECS, ...walk('docs', /\.md$/), 'README.md', 'CONTRIBUTING.md'];
for (const f of SPECS) {
  const md = read(f).replace(/```[\s\S]*?```/g, '');
  for (const m of new Set([...md.matchAll(TOKEN_LIKE)].map((x) => x[1]))) {
    if (!defined.has(m) && !NOT_TOKENS.has(m)) problems.push(`${f}: names \`${m}\`, which is not a token`);
  }
}

// ── Hand-written styles: motion from tokens ──────────────────────────────────────────────────────────
for (const f of ['src/styles/base.css', 'src/styles/motion.css']) {
  read(f).split('\n').forEach((line, i) => {
    if (!/\b(?:animation|transition)(?:-duration|-delay)?\s*:/.test(line) && !/animation-delay/.test(line)) return;
    const lit = line.replace(/0\.01ms|\b0m?s\b/g, '').match(/\b\d+(?:\.\d+)?m?s\b/);
    if (lit) problems.push(`${f}:${i + 1}: literal duration ${lit[0]} (use a --dur-* or --stagger* token)`);
  });
}

// ── Components: variables and colours ────────────────────────────────────────────────────────────────
const LAYERS = ['src/components', 'src/views', 'src/system', 'app/(dashboard)', 'app/embed', 'app/sign-in', 'app/system', 'app/not-found.tsx'].flatMap((d) => (d.endsWith('.tsx') ? (fs.existsSync(path.join(ROOT, d)) ? [d] : []) : walk(d, /\.tsx?$/)));
const PALETTE = /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|shadow|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?\b/;
for (const f of LAYERS) {
  const src = read(f);
  src.split('\n').forEach((line, i) => {
    if (/allow-literal-colour/.test(line)) return;
    if (f === 'src/system/page-stage.tsx' && /HOST_STYLES|--color-|--border-radius|#2A2A30|#EDEDF0/.test(line)) return; // a simulated foreign host's own colours
    const at = `${f}:${i + 1}`;
    const lit = line.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])|\brgba?\(\s*\d|\bhsla?\(/);
    if (lit && !/^\s*(\*|\/\/|\/\*)/.test(line)) problems.push(`${at}: literal colour ${lit[0]} (use a role)`);
    // Meridian resets Tailwind's scales; a utility outside them emits no CSS and fails silently.
    const dead = line.match(/\b(?:font-(?:normal|light|bold|extrabold|black|thin)|rounded-(?:2xl|3xl)|shadow-(?:sm|md|lg|xl|2xl)|text-(?:3xl|4xl|5xl))\b/);
    if (dead) problems.push(`${at}: ${dead[0]} is outside Meridian's scale and renders nothing (use font-regular, rounded-xl, shadow-card…)`);
    // Blur names its token (blur-sm, blur-md, blur-xl) or an arbitrary value; a bare or other name emits no filter.
    const blur = line.match(/\b(?:backdrop-)?blur(?:-(?!sm\b|md\b|xl\b|\[|\()[a-z0-9]+)?(?![-\w[(])/);
    if (blur && !/glow-blur/.test(blur.input!.slice(Math.max(0, blur.index! - 6), blur.index! + blur[0].length))) problems.push(`${at}: ${blur[0]} is outside Meridian's blur scale and renders nothing (use backdrop-blur-sm, -md or -xl)`);
    // Motion is tokens: a literal duration or delay drifts from the system and ignores the reduced-motion collapse.
    const dur = line.match(/\b(?:duration|delay)-(?:\[\d[^\]]*\]|\d+)\b/);
    if (dur) problems.push(`${at}: ${dur[0]} is a literal duration (use duration-(--dur-hover), --dur-enter, --dur-exit…)`);
    // A pressed control eases down only if its transition includes transform; a colour-only list makes the press snap.
    if (/(?:^|[\s'"`])press(?=[\s'"`])/.test(line) && /\btransition(?:-colors|-shadow|-opacity|-\[[^\]]*\])/.test(line) && !/\btransition-\[[^\]]*transform/.test(line))
      problems.push(`${at}: a press control's transition leaves out transform, so the press snaps (add transform to the list)`);
    const pal = line.match(PALETTE);
    if (pal) problems.push(`${at}: Tailwind palette class ${pal[0]} (use a role)`);
  });
  for (const m of new Set([...src.matchAll(/var\(--([a-z0-9-]+)/g), ...src.matchAll(/\(--([a-z0-9-]+)\)/g)].map((x) => x[1]))) {
    if (m.endsWith('-')) continue; // a name built at run time: var(--series-${slot})
    if (!defined.has(m) && !LOCAL.test(m)) problems.push(`${f}: uses --${m}, which is not defined`);
  }
}

console.log(problems.join('\n') || 'check: ok');
console.log(`${problems.length} problems · ${cards().length} cards · ${PAGE_SPECS.length} page specs · ${LAYERS.length} source files`);
process.exit(problems.length ? 1 : 0);
