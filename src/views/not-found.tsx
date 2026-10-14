import { nav } from '@/app.config';

/** What an address that leads nowhere says, outside the shell and inside it alike. */
export const NOT_FOUND = {
  /** The tab's title, which a refused address under `refusal: 'absent'` carries too (`gatedMetadata`). */
  title: 'Not found',
  kicker: '404 · Not found',
  sentence: 'This page isn’t here.',
  lead: 'The link may be mistyped or out of date, or what it pointed to has been removed.',
} as const;

export type Nearest = { href: string; label: string; rest: string };

/**
 * What the home page is called, read from `nav` rather than written here.
 *
 * A product whose front page is a ranked list, not "Home", should not have to edit this file — and the two
 * "Go to Home" buttons beside it — to say so. `nav` is where the product already names its own pages.
 */
export const homeLabel = nav.flatMap((g) => g.items).find((it) => it.href === '/')?.label ?? 'Home';

/**
 * Walk an address back to the deepest page that exists: the longest navigation entry it starts with, on a segment
 * boundary (`/requests` claims `/requests/req_1`, never `/requestsx`). What is left over is the part that leads nowhere.
 * With no match the nearest place is the home page and the whole address is left over.
 *
 * `withheld` is the entries the person may not open. A refused address walks back past them, so the answer names none of
 * them: a refused `/keys` reads exactly as `/nothing-lives-here` does.
 */
export function nearestOf(path: string, withheld: readonly string[] = []): Nearest {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const items = nav.flatMap((g) => g.items).filter((it) => it.href !== '/' && !withheld.includes(it.href));
  const hit = items
    .filter((it) => clean === it.href || clean.startsWith(it.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (hit) return { href: hit.href, label: hit.label, rest: clean.slice(hit.href.length) };
  return { href: '/', label: homeLabel, rest: clean === '/' ? '' : clean };
}

/** The address as a person typed it: percent-escapes decoded where they decode, kept as they are where they do not. */
export function readable(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}
