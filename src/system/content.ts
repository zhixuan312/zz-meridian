/**
 * The Atlas's content, read from the repository at build time: card specifications, guides, decisions, the changelog
 * and the tokens. The repository is the source of truth; the Atlas is a view of it and holds no copy.
 */
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p: string) => (fs.existsSync(path.join(/*turbopackIgnore: true*/ ROOT, p)) ? fs.readFileSync(path.join(/*turbopackIgnore: true*/ ROOT, p), 'utf8') : '');

export type Entry = {
  /** The Atlas path: /system/<section>/<id> */
  href: string;
  section: SectionId;
  id: string;
  title: string;
  summary: string;
  status?: string;
  source: string;
  kind: 'card' | 'doc' | 'tokens' | 'page';
};
export type SectionId = 'start' | 'tokens' | 'base' | 'components' | 'patterns' | 'pages' | 'system';

export const SECTIONS: { id: SectionId; num?: string; title: string; line: string }[] = [
  { id: 'start', title: 'Start here', line: 'What Meridian is, the surfaces it serves, and how to build with it' },
  { id: 'tokens', num: '0', title: 'Tokens', line: 'Values only: colour, type, space, radius, elevation, motion' },
  { id: 'base', num: '1', title: 'Base', line: 'The planes, text roles, the shell, surfaces and motion' },
  { id: 'components', num: '2', title: 'Components', line: 'Single-purpose parts that never know which page they are on' },
  { id: 'patterns', num: '3', title: 'Patterns', line: 'Components composed for one dashboard job, charts included' },
  { id: 'pages', num: '4', title: 'Pages', line: 'Routes on the console and views in an MCP host' },
  { id: 'system', title: 'The system', line: 'How to change it, what changed, and what was decided' },
];

/** Split a card README into its title, its first sentence (the lead), its status and the rest. */
export function parseSpec(md: string) {
  const title = md.match(/^#\s+(.+)$/m)?.[1].trim() ?? '';
  let body = md.replace(/^#\s+.+\n+/, '');
  const lead = body.split(/\n\n/, 1)[0].replace(/\n/g, ' ').trim();
  body = body.slice(body.indexOf(lead) + lead.length).trimStart();
  const status = body.match(/^Status:\s*(\w+)\s*\n/)?.[1];
  if (status) body = body.replace(/^Status:\s*\w+\s*\n+/, '');
  return { title, lead: lead.replace(/[*`]/g, ''), status, body };
}

const COMPONENT_DIRS: [string, SectionId][] = [
  ['src/components/base', 'base'],
  ['src/components/ui', 'components'],
  ['src/components/patterns', 'patterns'],
  ['src/components/charts', 'patterns'],
];

export const TOKEN_VIEWS = [
  { id: 'colour', title: 'Colour', summary: 'Every colour role in both themes and every accent, with contrast computed live' },
  { id: 'type', title: 'Type', summary: 'One family with a width axis, nine sizes, three weights and the text roles' },
  { id: 'space', title: 'Space and radius', summary: 'The 4px scale, control heights, densities and six corners' },
  { id: 'elevation', title: 'Elevation', summary: 'Three planes, hairlines, and shadows only where something floats' },
  { id: 'motion', title: 'Motion', summary: 'Arrive, answer, float: four durations and three curves' },
  { id: 'data', title: 'Data colour', summary: 'Six categorical slots, the neutral population, and the status trio' },
];

export const DOCS: { id: string; section: SectionId; file: string; title?: string; summary?: string }[] = [
  { id: 'overview', section: 'start', file: 'README.md', title: 'Overview' },
  { id: 'surfaces', section: 'start', file: 'docs/surfaces.md' },
  { id: 'agents', section: 'start', file: 'docs/agents.md' },
  { id: 'assistant', section: 'start', file: 'docs/assistant.md' },
  { id: 'start-a-dashboard', section: 'start', file: 'docs/start-a-dashboard.md' },
  { id: 'data-display', section: 'start', file: 'docs/data-display.md' },
  { id: 'voice', section: 'start', file: 'docs/voice.md' },
  { id: 'contributing', section: 'system', file: 'CONTRIBUTING.md', title: 'Contributing', summary: 'How to propose, build, check and release a change' },
  { id: 'changelog', section: 'system', file: 'CHANGELOG.md', title: 'Changelog', summary: 'Every release, with what breaks and what to do instead' },
  { id: 'decisions', section: 'system', file: 'decisions', title: 'Decisions', summary: 'Choices recorded so they are not argued again' },
  { id: 'benchmark', section: 'system', file: 'docs/benchmark.md', title: 'Benchmark', summary: 'Meridian against award-winning systems, and what changed because of it' },
];

export const PAGES: { id: string; title: string; route: string; embed?: string; spec: string }[] = [
  { id: 'overview', title: 'Overview', route: '/', embed: '/embed/overview', spec: 'app/(dashboard)/README.md' },
  { id: 'requests', title: 'Requests', route: '/requests', embed: '/embed/requests', spec: 'app/(dashboard)/requests/README.md' },
  { id: 'request', title: 'Request', route: '/requests/req_qmi1vbyi3uqt', spec: 'app/(dashboard)/requests/[id]/README.md' },
  { id: 'analytics', title: 'Analytics', route: '/analytics', spec: 'app/(dashboard)/analytics/README.md' },
  { id: 'health', title: 'Health', route: '/health', embed: '/embed/health', spec: 'app/(dashboard)/health/README.md' },
  { id: 'customers', title: 'Customers', route: '/customers', spec: 'app/(dashboard)/customers/README.md' },
  { id: 'keys', title: 'API keys', route: '/keys', spec: 'app/(dashboard)/keys/README.md' },
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

export function entries(): Entry[] {
  const out: Entry[] = [];
  for (const d of DOCS.filter((x) => x.section === 'start')) { const e = docEntry(d); if (e) out.push(e); }
  for (const t of TOKEN_VIEWS) out.push({ href: `/system/tokens/${t.id}`, section: 'tokens', id: t.id, title: t.title, summary: t.summary, source: 'tokens/', kind: 'tokens' });
  for (const [dir, section] of COMPONENT_DIRS) {
    const abs = path.join(/*turbopackIgnore: true*/ ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).sort()) {
      const md = read(`${dir}/${name}/README.md`);
      if (!md) continue;
      const s = parseSpec(md);
      out.push({ href: `/system/${section}/${name}`, section, id: name, title: s.title, summary: s.lead, status: s.status, source: `${dir}/${name}`, kind: 'card' });
    }
  }
  for (const p of PAGES) {
    const md = read(p.spec);
    const s = md ? parseSpec(md) : null;
    out.push({ href: `/system/pages/${p.id}`, section: 'pages', id: p.id, title: p.title, summary: s?.lead ?? '', status: s?.status, source: p.spec, kind: 'page' });
  }
  for (const d of DOCS.filter((x) => x.section === 'system')) { const e = docEntry(d); if (e) out.push(e); }
  return out.map((e) => ({ ...e })).sort((a, b) => (a.section === b.section && a.kind === 'card' && b.kind === 'card' ? a.title.localeCompare(b.title) : 0));
}

export function entry(section: string, id: string) {
  return entries().find((e) => e.section === section && e.id === id) ?? null;
}

export function specOf(e: Entry) {
  if (e.kind === 'card') return parseSpec(read(`${e.source}/README.md`));
  if (e.kind === 'page') return parseSpec(read(e.source));
  if (e.id === 'decisions') {
    const dir = path.join(/*turbopackIgnore: true*/ ROOT, 'decisions');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
    const body = files.map((f) => read(`decisions/${f}`).replace(/^#\s+/m, '## ').replace(/\n## (?!\d)/g, '\n### ')).join('\n\n');
    return { title: 'Decisions', lead: 'One record per lasting decision. A record is superseded by a new one, never rewritten.', status: undefined, body };
  }
  return parseSpec(read(e.source));
}

/** Facts for the front door, derived, never typed in. */
export function stats() {
  const all = entries();
  const tokens = ['core', 'theme.light', 'accent.cobalt']
    .map((f) => JSON.parse(read(`tokens/${f}.tokens.json`)))
    .reduce((n, j) => n + Object.entries(j).filter(([k]) => !k.startsWith('$')).reduce((m, [, g]: [string, any]) => m + Object.keys(g).filter((k) => !k.startsWith('$')).length, 0), 0);
  return {
    tokens,
    base: all.filter((e) => e.section === 'base').length,
    components: all.filter((e) => e.section === 'components').length,
    patterns: all.filter((e) => e.section === 'patterns').length,
    pages: PAGES.length,
    version: read('CHANGELOG.md').match(/^## \[([\d.]+)\]/m)?.[1] ?? '0.1.0',
  };
}

export function readRepo(p: string) {
  return read(p);
}
