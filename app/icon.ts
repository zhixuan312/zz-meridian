import fs from 'node:fs';
import path from 'node:path';
import { hex, oklchToRgb } from '@/lib/color';

/**
 * The browser tab's icon: the App mark in the product's default accent, read from the tokens at build time, so a new
 * brand (`scripts/brand.ts`) repaints it with nothing else to change. Dark theme values: tabs sit on browser chrome.
 */
export const contentType = 'image/svg+xml';

const token = (file: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tokens', file), 'utf8'));

export default function Icon() {
  const id = token('zz-meridian.resolver.json').modifiers.accent.default;
  const preset = token(`accent.${id}.tokens.json`);
  const dark = preset.$extensions?.['dev.zz.meridian']?.overrides?.dark ?? {};
  const l = dark['accent-l'] ?? token('theme.dark.tokens.json').accent['accent-l'].$value;
  const fill = hex(oklchToRgb(l, preset.accent['accent-c'].$value, preset.accent['accent-h'].$value));
  const ink = dark['on-accent'] ?? hex(oklchToRgb(0.99, 0, 0));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="6.5" fill="${fill}"/>
  <path d="M4.5 15.5 8.2 11.6l3.1 2.4 4.2-5.6 4 3.6" fill="none" stroke="${ink}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M15.5 4.6v14.8" stroke="${ink}" stroke-opacity=".55" stroke-width="1.3" stroke-linecap="round"/>
  <circle cx="15.5" cy="8.4" r="2" fill="${ink}"/>
</svg>`;
  return new Response(svg, { headers: { 'Content-Type': contentType } });
}
