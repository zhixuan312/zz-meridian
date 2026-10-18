// @vitest-environment node
// The Design Atlas renders the repository's markdown as pages under /system: the documents, every card's README and
// every page specification (src/system/content.ts's entries). It renders their links as written, so a relative link to
// a repository file (`[docs/testing.md](docs/testing.md)`) resolves against the page's address and answers 404 there.
// A document the Atlas serves names a repository file in backticks, as the others do, and links only to an address
// (`/`, `#`, `http`, `mailto:`). Found on /system/system/contributing at 89e4ef4.
import fs from 'node:fs';
import path from 'node:path';
import { expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { entries } = await import('../src/system/content.ts');

const ROOT = path.resolve(import.meta.dirname, '..');

/** Every markdown file an Atlas entry renders: a file, a card folder's README.md, or every .md in a folder. */
function served(): string[] {
  return [...new Set(entries().filter((e) => e.kind !== 'tokens').flatMap((e) => {
    const p = path.join(ROOT, e.source);
    if (!fs.statSync(p).isDirectory()) return [e.source];
    if (fs.existsSync(path.join(p, 'README.md'))) return [path.join(e.source, 'README.md')];
    return fs.readdirSync(p).filter((x) => x.endsWith('.md')).map((x) => path.join(e.source, x));
  }))];
}

export function relativeLinks(md: string): string[] {
  const prose = md.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const inline = [...prose.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);
  const reference = [...prose.matchAll(/^\s{0,3}\[[^\]]+\]:\s*(\S+)/gm)].map((m) => m[1]);
  return [...inline, ...reference].filter((href) => !/^(https?:|mailto:|\/|#)/.test(href));
}

it('serves no document with a link that resolves against its Atlas page', () => {
  const files = served();
  expect(files.length).toBeGreaterThan(100);
  const found = files.flatMap((f) => relativeLinks(fs.readFileSync(path.join(ROOT, f), 'utf8')).map((href) => `${f}: ](${href})`));
  expect(found).toEqual([]);
});

it('finds a relative link, inline or by reference, and leaves addresses, anchors and code alone', () => {
  expect(relativeLinks('See [the table](docs/testing.md) and [x](../a.md).\n\n[ref]: notes/b.md')).toEqual(['docs/testing.md', '../a.md', 'notes/b.md']);
  expect(relativeLinks('[a](/system) [b](#rules) [c](https://x.dev) [m](mailto:a@b.c) `[d](e.md)`\n```\n[f](g.md)\n```\n[r]: https://x.dev')).toEqual([]);
});
