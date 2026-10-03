/**
 * Token metadata for the Atlas's token views: every token's name, group, type and description, read from the DTCG
 * files. Values are not copied here: the views read them live from the CSS, in the theme and accent they show.
 */
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

export type TokenMeta = { name: string; type: string; description: string; css?: string; value: string };
export type TokenGroup = { id: string; title: string; about: string; source: string; tokens: TokenMeta[] };

const T = path.join(process.cwd(), 'tokens');
const NS = 'dev.zz.meridian';

function groups(file: string): TokenGroup[] {
  const j = JSON.parse(fs.readFileSync(path.join(/*turbopackIgnore: true*/ T, file), 'utf8'));
  return Object.entries(j)
    .filter(([k, v]) => !k.startsWith('$') && typeof v === 'object')
    .map(([id, g]: [string, any]) => {
      const [title, ...rest] = String(g.$description ?? id).split(': ');
      return {
        id,
        title,
        about: rest.join(': '),
        source: `tokens/${file}`,
        tokens: Object.entries(g)
          .filter(([k]) => !k.startsWith('$'))
          .map(([name, t]: [string, any]) => ({ name, type: t.$type, description: t.$description ?? '', css: t.$extensions?.[NS]?.css, value: t.$value && typeof t.$value === 'object' && 'value' in t.$value ? `${t.$value.value}${t.$value.unit}` : JSON.stringify(t.$value) })),
      };
    });
}

export function tokenGroups() {
  return { core: groups('core.tokens.json'), theme: groups('theme.dark.tokens.json'), compact: groups('density.compact.tokens.json') };
}
