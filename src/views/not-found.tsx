import { nav } from '@/app.config';

/** What an address that leads nowhere says, outside the shell and inside it alike. */
export const NOT_FOUND = {
  kicker: '404 · Not found',
  sentence: 'This page isn’t here.',
  lead: 'The link may be mistyped or out of date, or what it pointed to has been removed.',
} as const;

export type Nearest = { href: string; label: string; rest: string };

/**
 * Walk an address back to the deepest page that exists: the longest navigation entry it starts with, on a segment
 * boundary (`/requests` claims `/requests/req_1`, never `/requestsx`). What is left over is the part that leads nowhere.
 * With no match the nearest place is the Overview and the whole address is left over.
 */
export function nearestOf(path: string): Nearest {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const items = nav.flatMap((g) => g.items).filter((it) => it.href !== '/');
  const hit = items
    .filter((it) => clean === it.href || clean.startsWith(it.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (hit) return { href: hit.href, label: hit.label, rest: clean.slice(hit.href.length) };
  return { href: '/', label: 'Overview', rest: clean === '/' ? '' : clean };
}

/** The address as a person typed it: percent-escapes decoded where they decode, kept as they are where they do not. */
export function readable(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}
