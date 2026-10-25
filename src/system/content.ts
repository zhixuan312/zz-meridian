/**
 * The Atlas's content, read from the repository at build time: card specifications, guides, decisions, the changelog
 * and the tokens. The repository is the source of truth; the Atlas is a view of it and holds no copy.
 */
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';

const ROOT = process.cwd();
const read = (p: string) => (fs.existsSync(path.join(/*turbopackIgnore: true*/ ROOT, p)) ? fs.readFileSync(path.join(/*turbopackIgnore: true*/ ROOT, p), 'utf8') : '');

type Entry = {
  /** The Atlas path: /system/<section>/<id> */
  href: string;
  section: SectionId;
  id: string;
  title: string;
  summary: string;
  status?: string;
  source: string;
  kind: 'card' | 'template' | 'doc' | 'tokens' | 'page';
  /** For a bound page: the id of the template entry it is built from. */
  template?: string;
};
type SectionId = 'start' | 'tokens' | 'base' | 'components' | 'patterns' | 'pages' | 'products' | 'system';

export const SECTIONS: { id: SectionId; num?: string; title: string; line: string }[] = [
  { id: 'start', title: 'Start here', line: 'What Meridian is, the surfaces it serves, and how to build with it' },
  { id: 'tokens', num: '0', title: 'Tokens', line: 'Values only: colour, type, space, radius, elevation, motion' },
  { id: 'base', num: '1', title: 'Base', line: 'The planes, text roles, the shell, surfaces and motion' },
  { id: 'components', num: '2', title: 'Components', line: 'Single-purpose parts that never know which page they are on' },
  { id: 'patterns', num: '3', title: 'Patterns', line: 'Components composed for one dashboard job, charts included' },
  { id: 'pages', num: '4', title: 'Pages', line: 'Routes on the console and views in an MCP host' },
  { id: 'products', num: '5', title: 'Product workspaces', line: 'How a product is assembled from its pages, declared in the configuration and written down in its guide' },
  { id: 'system', title: 'The system', line: 'How to change it, what changed, and what was decided' },
];

/**
 * Split a card README into its title, its first sentence (the lead), its status and the rest.
 *
 * The lead is the first paragraph that SAYS something. A document may open with badges — this repository's own README
 * carries the npm badge under its title, as the rest of the family's do — and a strip of images is not a sentence about
 * the page. Taken as the lead it was shown raw, `[![npm: zz-meridian](https://img.shields.io/…)`, in the Atlas, because
 * that is where the summary comes from.
 */
function parseSpec(md: string) {
  const title = md.match(/^#\s+(.+)$/m)?.[1].trim() ?? '';
  let body = md.replace(/^#\s+.+\n+/, '');
  const banner = (p: string) => /^\s*(\[!\[|!\[|<img)/.test(p);
  const lead = (body.split(/\n{2,}/).find((p) => !banner(p)) ?? '').replace(/\n/g, ' ').trim();
  body = body.slice(body.indexOf(lead) + lead.length).trimStart();
  const status = body.match(/^Status:\s*(\w+)\s*\n/)?.[1];
  if (status) body = body.replace(/^Status:\s*\w+\s*\n+/, '');
  return { title, lead: lead.replace(/[*`]/g, ''), status, body };
}

/** Where cards live: the folder, its section, the prefix of its ids and what each is. A page template is listed in Pages under `template-<folder>`, the same id scripts/registry.ts gives its preview, so no bound page's id can collide with it. */
const COMPONENT_DIRS: [string, SectionId, string, 'card' | 'template'][] = [
  ['src/components/base', 'base', '', 'card'],
  ['src/components/ui', 'components', '', 'card'],
  ['src/components/patterns', 'patterns', '', 'card'],
  ['src/components/charts', 'patterns', '', 'card'],
  ['src/components/templates', 'pages', 'template-', 'template'],
];

const TOKEN_VIEWS = [
  { id: 'colour', title: 'Colour', summary: 'Every colour role in both themes and every accent, with contrast computed live' },
  { id: 'type', title: 'Type', summary: 'One family with a mono, eleven sizes, three weights and the text roles' },
  { id: 'space', title: 'Space and radius', summary: 'The 4px scale, control heights, densities and six corners' },
  { id: 'layout', title: 'Layout', summary: 'The shell, the width each kind of page is read at, and the gutter' },
  { id: 'elevation', title: 'Elevation', summary: 'The planes and their hairlines, what floats and how high, and the glass in front of it' },
  { id: 'motion', title: 'Motion', summary: 'Arrive, answer, float: a duration for each job, three curves and three loops' },
  { id: 'data', title: 'Data colour', summary: 'Six categorical slots, the neutral population, and the status trio' },
];

const DOCS: { id: string; section: SectionId; file: string; title?: string; summary?: string }[] = [
  { id: 'overview', section: 'start', file: 'README.md', title: 'Overview' },
  { id: 'surfaces', section: 'start', file: 'docs/surfaces.md' },
  { id: 'agents', section: 'start', file: 'docs/agents.md' },
  { id: 'assistant', section: 'start', file: 'docs/assistant.md' },
  { id: 'start-a-dashboard', section: 'start', file: 'docs/start-a-dashboard.md' },
  { id: 'data-display', section: 'start', file: 'docs/data-display.md' },
  { id: 'data-layers', section: 'start', file: 'docs/data-layers.md' },
  { id: 'voice', section: 'start', file: 'docs/voice.md' },
  { id: 'workspaces', section: 'products', file: 'docs/product-workspaces.md' },
  { id: 'contributing', section: 'system', file: 'CONTRIBUTING.md', title: 'Contributing', summary: 'How to propose, build, check and release a change' },
  { id: 'changelog', section: 'system', file: 'CHANGELOG.md', title: 'Changelog', summary: 'Every release, with what breaks and what to do instead' },
  { id: 'decisions', section: 'system', file: 'decisions', title: 'Decisions', summary: 'Choices recorded so they are not argued again' },
  { id: 'benchmark', section: 'system', file: 'docs/benchmark.md', title: 'Benchmark', summary: 'Meridian against award-winning systems, and what changed because of it' },
];

/** The bound pages. `template` names the template entry a page's view is built from; a page that arranges its own patterns names none. */
export const PAGES: { id: string; title: string; route: string; embed?: string; spec: string; template?: string }[] = [
  { id: 'home', title: 'Home', route: '/', embed: '/embed/home', spec: 'app/(dashboard)/(home)/README.md' },
  { id: 'requests', title: 'Requests', route: '/requests', embed: '/embed/requests', spec: 'app/(dashboard)/requests/README.md', template: 'template-records' },
  { id: 'request', title: 'Request', route: '/requests/req_qmi1vbyi3uqt', spec: 'app/(dashboard)/requests/[id]/README.md' },
  { id: 'revenue', title: 'Revenue', route: '/business', spec: 'app/(dashboard)/business/README.md' },
  { id: 'usage', title: 'Usage', route: '/usage', spec: 'app/(dashboard)/usage/README.md' },
  { id: 'now', title: 'Now', route: '/engineering', embed: '/embed/now', spec: 'app/(dashboard)/engineering/README.md' },
  { id: 'services', title: 'Services', route: '/services', spec: 'app/(dashboard)/services/README.md' },
  { id: 'customers', title: 'Customers', route: '/customers', spec: 'app/(dashboard)/customers/README.md', template: 'template-records' },
  { id: 'customer', title: 'Customer', route: '/customers/northwind-labs', spec: 'app/(dashboard)/customers/[id]/README.md' },
  { id: 'keys', title: 'API keys', route: '/keys', spec: 'app/(dashboard)/keys/README.md', template: 'template-records' },
  { id: 'tickets', title: 'Tickets', route: '/operations-tickets', spec: 'app/(dashboard)/operations-tickets/README.md', template: 'template-records' },
  { id: 'tests', title: 'Tests', route: '/tests', spec: 'app/(dashboard)/tests/README.md', template: 'template-records' },
  { id: 'releases', title: 'Releases', route: '/releases', spec: 'app/(dashboard)/releases/README.md', template: 'template-records' },
  { id: 'members', title: 'Members', route: '/members', spec: 'app/(dashboard)/members/README.md', template: 'template-records' },
  { id: 'settings', title: 'Settings', route: '/settings', spec: 'app/(dashboard)/settings/README.md' },
  { id: 'sign-in', title: 'Sign in', route: '/sign-in', spec: 'app/sign-in/README.md' },
  { id: 'not-found', title: 'Not found', route: '/does-not-exist', spec: 'app/not-found/README.md' },
  { id: 'proposal', title: 'Agent proposal', route: '/embed/proposal', embed: '/embed/proposal', spec: 'app/embed/proposal/README.md' },
];

function docEntry(d: (typeof DOCS)[number]): Entry | null {
  if (d.file === 'decisions') {
    return { href: `/system/${d.section}/${d.id}`, section: d.section, id: d.id, title: d.title!, summary: d.summary!, source: 'decisions/', kind: 'doc' };
  }
  const md = read(d.file);
  if (!md) return null;
  const s = parseSpec(md);
  return { href: d.id === 'overview' ? '/system/start/overview' : `/system/${d.section}/${d.id}`, section: d.section, id: d.id, title: d.title ?? s.title, summary: d.summary ?? s.lead, source: d.file, kind: 'doc' };
}

/**
 * Every entry the Atlas lists, read once per request: the walk reads 73 specifications, and the sidebar and the article
 * both ask for the list on a request-rendered page, so one page read them twice. The scope is the request's rather than
 * the process's, so a preview under `next dev` that edits a README still sees it on the next request; a build renders
 * each page once, so it reads them once.
 */
const build = cache((): Entry[] => {
  const out: Entry[] = [];
  for (const d of DOCS.filter((x) => x.section === 'start')) { const e = docEntry(d); if (e) out.push(e); }
  for (const t of TOKEN_VIEWS) out.push({ href: `/system/tokens/${t.id}`, section: 'tokens', id: t.id, title: t.title, summary: t.summary, source: 'tokens/', kind: 'tokens' });
  for (const [dir, section, prefix, kind] of COMPONENT_DIRS) {
    const abs = path.join(/*turbopackIgnore: true*/ ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).sort()) {
      const md = read(`${dir}/${name}/README.md`);
      if (!md) continue;
      const s = parseSpec(md);
      out.push({ href: `/system/${section}/${prefix}${name}`, section, id: `${prefix}${name}`, title: s.title, summary: s.lead, status: s.status, source: `${dir}/${name}`, kind });
    }
  }
  for (const p of PAGES) {
    const md = read(p.spec);
    const s = md ? parseSpec(md) : null;
    out.push({ href: `/system/pages/${p.id}`, section: 'pages', id: p.id, title: p.title, summary: s?.lead ?? '', status: s?.status, source: p.spec, kind: 'page', template: p.template });
  }
  for (const d of DOCS.filter((x) => x.section === 'products' || x.section === 'system')) { const e = docEntry(d); if (e) out.push(e); }
  return out.map((e) => ({ ...e })).sort((a, b) => (a.section === b.section && a.kind === 'card' && b.kind === 'card' ? a.title.localeCompare(b.title) : 0));
});

/** A copy per call, so a caller that sorts or edits what it is handed cannot change the list the page's other reader sees. */
export function entries(): Entry[] {
  return build().map((e) => ({ ...e }));
}

export function entry(section: string, id: string) {
  return entries().find((e) => e.section === section && e.id === id) ?? null;
}

export function specOf(e: Entry) {
  if (e.kind === 'card' || e.kind === 'template') return parseSpec(read(`${e.source}/README.md`));
  if (e.kind === 'page') return parseSpec(read(e.source));
  if (e.id === 'decisions') {
    const dir = path.join(/*turbopackIgnore: true*/ ROOT, 'decisions');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
    const body = files.map((f) => read(`decisions/${f}`).replace(/^#\s+/m, '## ').replace(/\n## (?!\d)/g, '\n### ')).join('\n\n');
    return { title: 'Decisions', lead: 'One record per lasting decision. A record is superseded by a new one, never rewritten.', status: undefined, body };
  }
  return parseSpec(read(e.source));
}

/**
 * The line an entry's article and the shelf name it by. Layer 4 tells a reusable template from a page bound to the
 * product; a section with no number (the guides, the system's own pages) is named by its title alone.
 */
export function layerOf(e: Entry) {
  const sec = SECTIONS.find((s) => s.id === e.section)!;
  if (e.section === 'pages') return `Layer ${sec.num} · ${e.kind === 'template' ? 'Page template' : 'Page'}`;
  return sec.num ? `Layer ${sec.num} · ${sec.title}` : sec.title;
}

/** Facts for the front door, derived, never typed in. */
export function stats() {
  const all = entries();
  const tokens = ['core', 'theme.light', 'accent.cobalt']
    .map((f) => JSON.parse(read(`tokens/${f}.tokens.json`)))
    .reduce((n, j) => n + Object.entries(j).filter(([k]) => !k.startsWith('$')).reduce((m, [, g]) => m + Object.keys(g as object).filter((k) => !k.startsWith('$')).length, 0), 0);
  return {
    tokens,
    base: all.filter((e) => e.section === 'base').length,
    components: all.filter((e) => e.section === 'components').length,
    patterns: all.filter((e) => e.section === 'patterns').length,
    pages: PAGES.length,
    templates: all.filter((e) => e.kind === 'template').length,
    version: read('CHANGELOG.md').match(/^## \[([\d.]+)\]/m)?.[1] ?? '0.1.0',
  };
}

export function readRepo(p: string) {
  return read(p);
}
