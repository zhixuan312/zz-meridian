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

/** The parts of a DTCG 2025.10 file the Atlas reads: a group's description, and each token's type, value and CSS name. */
type DtcgToken = { $type: string; $description?: string; $value: unknown; $extensions?: Record<string, { css?: string }> };
type DtcgGroup = { $description?: string } & Record<string, DtcgToken>;

function groups(file: string): TokenGroup[] {
  const j = JSON.parse(fs.readFileSync(path.join(/*turbopackIgnore: true*/ T, file), 'utf8'));
  return (Object.entries(j).filter(([k, v]) => !k.startsWith('$') && typeof v === 'object') as [string, DtcgGroup][])
    .map(([id, g]) => {
      const [title, ...rest] = String(g.$description ?? id).split(': ');
      return {
        id,
        title,
        about: rest.join(': '),
        source: `tokens/${file}`,
        tokens: (Object.entries(g).filter(([k]) => !k.startsWith('$')) as [string, DtcgToken][])
          .map(([name, t]) => {
            // A dimension is { value, unit }; everything else prints as its JSON.
            const v = t.$value as { value?: unknown; unit?: unknown } | null;
            return { name, type: t.$type, description: t.$description ?? '', css: t.$extensions?.[NS]?.css, value: v && typeof v === 'object' && 'value' in v ? `${v.value}${v.unit}` : JSON.stringify(t.$value) };
          }),
      };
    });
}

export function tokenGroups() {
  return { core: groups('core.tokens.json'), theme: groups('theme.dark.tokens.json'), compact: groups('density.compact.tokens.json') };
}
