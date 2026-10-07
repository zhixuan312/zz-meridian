/**
 * Migrations a release declares beyond copying files: a change the team must make in code or data that update cannot
 * make for it. A release adds an entry here when it ships such a change. Each `applies` only reads, and only the
 * team's own files: a managed file is Meridian's and arrives with the update.
 */
import fs from 'node:fs';
import path from 'node:path';
import { FIXED } from './ownership.js';
import { isNewer } from './update.js';
import type { Migration } from './update-session.js';

export type ReleaseMigration = {
  id: string;
  /** The release that introduced the change. The entry applies when `source < since <= target`. */
  since: string;
  /** The project paths the change touches, or null when this project does not need it. */
  applies: (root: string) => string[] | null;
  summary: string;
  instructions: string;
  checks: string[];
};

// ── Reading the team's files ─────────────────────────────────────────────────────────────────────────

const SOURCE = /\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/;
const SKIP = new Set(['node_modules', '.next', '.git', '.meridian', 'out', 'coverage']);
const MANAGED_DIRS = ['tokens/', 'src/styles/', 'src/components/', 'scripts/', '.agents/', '.claude/'];
const MANAGED_FILES = new Set(FIXED);

/** Meridian's own paths, by the same rule `update` applies; everything else is the team's. */
const isTeamOwned = (rel: string) => !MANAGED_DIRS.some((d) => rel.startsWith(d)) && !MANAGED_FILES.has(rel);

const text = (root: string, rel: string): string | null => {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return null;
  }
};

const walk = (root: string, rel: string, out: string[], want: RegExp = SOURCE) => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (SKIP.has(e.name)) continue;
    const p = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(root, p, out, want);
    else if (e.isFile() && want.test(e.name) && isTeamOwned(p)) out.push(p);
  }
};

/** The team's source files under the folders a Next project keeps them in, with their text. */
function teamSources(root: string): { rel: string; src: string }[] {
  const files: string[] = [];
  for (const d of ['app', 'pages', 'src', 'tests']) walk(root, d, files);
  return files.flatMap((rel) => {
    const src = text(root, rel);
    return src === null ? [] : [{ rel, src }];
  });
}

/** The paths of the team's files where `test` holds, or null when none does. */
const matching = (root: string, test: (rel: string, src: string) => boolean): string[] | null => {
  const hits = teamSources(root).filter((f) => test(f.rel, f.src)).map((f) => f.rel);
  return hits.length > 0 ? hits : null;
};

/** The team's files outside the managed folders where `verify` is followed on one line by a flag the modes replaced. */
function removedVerifyFlags(root: string): string[] | null {
  const files: string[] = ['package.json'];
  walk(root, '.github/workflows', files, /\.ya?ml$/);
  walk(root, '', files, /\.sh$/);
  const removed = /\bverify\b[^\n]*?--(?:quick|no-vitals|extra)\b/;
  const hits = [...new Set(files)].filter((rel) => removed.test(text(root, rel) ?? ''));
  return hits.length > 0 ? hits : null;
}

const base = (rel: string) => rel.slice(rel.lastIndexOf('/') + 1);
const isPageOrLayout = (rel: string) => rel.startsWith('app/') && /^(?:page|layout)\.tsx?$/.test(base(rel));
const isActionsFile = (rel: string) => /^actions\.tsx?$/.test(base(rel));
const isServerFile = (src: string) => /^\s*(['"])use server\1/m.test(src);

/** The tag `<name …>` bodies in a file, with `=>` inside an attribute not ending the tag. */
const tags = (src: string, name: string): string[] => [...src.matchAll(new RegExp(`<${name}\\b((?:=>|[^>])*)>`, 'g'))].map((m) => m[1]!);

/** How many top-level arguments each call of `fn(` in a file passes; a definition (`function fn(`) is not a call. */
function callArity(src: string, fn: string): number[] {
  const out: number[] = [];
  for (const m of src.matchAll(new RegExp(`(?<![\\w.$])${fn}\\(`, 'g'))) {
    if (/function\s+$/.test(src.slice(0, m.index))) continue;
    let depth = 0;
    let args = 0;
    let seen = false;
    for (let i = m.index + m[0].length; i < src.length; i++) {
      const c = src[i]!;
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') {
        if (depth === 0) break;
        depth--;
      } else if (c === ',' && depth === 0) {
        args++;
        seen = false;
        continue;
      }
      if (!/\s/.test(c)) seen = true;
    }
    out.push(args + (seen ? 1 : 0));
  }
  return out;
}

// ── The registry ─────────────────────────────────────────────────────────────────────────────────────

const GATE_AND_BUILD = ['gate', 'build'];

export const RELEASE_MIGRATIONS: ReleaseMigration[] = [
  {
    id: 'verify-modes',
    since: '0.5.0',
    applies: removedVerifyFlags,
    summary: 'verify has three modes, and --quick, --no-vitals and --extra are gone.',
    instructions: 'Read "Validation" in references/validation.md. Run `pnpm verify` for the bounded default (the gate once, one build, the size checks and a smoke of up to three routes), `pnpm verify --full` for every exhaustive suite and `pnpm verify --perf` for the 20-sample navigation protocol, and replace the removed flags in the script, workflow or shell file. Read the coverage line each run ends with: it says what ran and what did not.',
    checks: ['gate'],
  },
  {
    id: 'shell-assistant-promise',
    since: '0.5.0',
    applies: (root) => matching(root, (_, src) => tags(src, 'AppShell').some((t) => /\bassistant\s*=/.test(t)) && !/\.then\(|Promise|\buse\(/.test(src)),
    summary: "AppShell's assistant prop is a Promise<boolean>, not a boolean.",
    instructions: 'Read "The shell\'s assistant promise" in references/cache.md. Pass a promise of whether the assistant is configured, such as `connection().then(() => assistantConfig(process.env) !== null)`, and do not await it in the layout. The launcher keeps its place until the promise resolves true.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'assistant-available-promise',
    since: '0.5.0',
    applies: (root) => matching(root, (_, src) => !/\buse\(/.test(src) && callArity(src, 'useAssistantAvailable').length > 0),
    summary: 'useAssistantAvailable() returns a Promise<boolean>, not a boolean.',
    instructions: 'Read "The shell\'s assistant promise" in references/cache.md. Read the hook with `use(useAssistantAvailable())` inside a Suspense boundary that keeps the control\'s space, and render nothing clickable until it is true.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'clock-now-required',
    since: '0.5.0',
    applies: (root) => matching(root, (_, src) => ['Freshness', 'ShellTools', 'AlertsPanel'].some((n) => tags(src, n).some((t) => !/\bnow\s*=/.test(t))) || callArity(src, 'formatRelative').some((n) => n === 1)),
    summary: 'Freshness, ShellTools, AlertsPanel and formatRelative take the data clock explicitly.',
    instructions: 'Read "The clock is the data\'s" in references/cache.md. Pass `now` (the read\'s `observedAt`, or the data\'s clock) to each `<Freshness>`, `<ShellTools>` and `<AlertsPanel>`, and as the second argument of `formatRelative`. None of them reads the browser\'s clock any more.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'cache-components-config',
    since: '0.5.0',
    applies: (root) => {
      let names: string[] = [];
      try {
        names = fs.readdirSync(root);
      } catch { /* an unreadable root has no config */ }
      const found = names.filter((f) => /^next\.config\.(?:ts|js|mjs|cjs|mts)$/.test(f));
      const lacking = found.filter((f) => {
        const src = text(root, f) ?? '';
        return !/\bcacheComponents\s*:\s*true\b/.test(src) || !/\bpartialPrefetching\s*:\s*true\b/.test(src);
      });
      return lacking.length > 0 ? lacking : null;
    },
    summary: 'next.config sets cacheComponents and partialPrefetching.',
    instructions: 'Read "Turn Cache Components on" in references/cache.md. Add `cacheComponents: true` and `partialPrefetching: true` to the Next config, then make every route static or partial: a page that reads the request or an uncached source streams that part behind its own Suspense boundary.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'connection-boundaries',
    since: '0.5.0',
    applies: (root) => matching(root, (rel, src) => isPageOrLayout(rel) && /\bawait\s+connection\(\)/.test(src)),
    summary: 'A page or layout no longer awaits connection() as a render-per-request switch.',
    instructions: 'Read "Turn Cache Components on" in references/cache.md. Remove `await connection()` from the page or layout. Read request-dependent data inside a Suspense boundary of its own, through `read()` for a collection, so the rest of the route prerenders. A promise such as `connection().then(…)` that the shell resolves behind a boundary stays allowed.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'authorized-read',
    since: '0.5.0',
    applies: (root) => matching(root, (rel, src) => rel.startsWith('app/') && /^page\.tsx?$/.test(base(rel)) && /\.query\(/.test(src)),
    summary: 'A page reads a collection through the authorized, cached read(), not by querying it directly.',
    instructions: 'Read "Authorized, scoped reads" in references/cache.md. Replace `collection.query(q)` in the page with `read(name, q)` from `src/data/read.ts`, format any freshness against the returned `observedAt`, and add `src/data/access.ts` and `src/data/read.ts` from the reference, bound to your own sign-in and database predicates.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'scoped-invalidation',
    since: '0.5.0',
    applies: (root) => matching(root, (_, src) => isServerFile(src) && /\.(?:create|update|remove)!?\(/.test(src) && !/\b(?:updateTag|revalidateTag)\(/.test(src)),
    summary: 'A Server Action that writes a collection invalidates that tenant\'s cached reads.',
    instructions: 'Read "Writes authorize, then invalidate" in references/cache.md. After the commit, call `updateTag(collectionTag(scope.tenantId, name))`, and write through `collectionFor(scope, name)`, never a collection bound elsewhere. Authorize the operation and every record it touches first.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'live-provider',
    since: '0.5.0',
    applies: (root) => {
      const out: string[] = [];
      const layout = 'app/(dashboard)/layout.tsx';
      const collections = 'src/data/collections.ts';
      if (text(root, collections) !== null && text(root, 'src/data/live-actions.ts') === null) out.push(collections);
      const src = text(root, layout);
      if (src !== null && !/\b(?:LiveProvider|ConsoleLive)\b/.test(src)) out.push(layout);
      return out.length > 0 ? out : null;
    },
    summary: 'The console has a live route, a refresh action and a provider.',
    instructions: 'Read "The live starters" and "Refreshing" in references/live.md. Add `app/api/live/route.ts`, `src/data/live-stream.ts`, `src/data/live-actions.ts` and `src/views/console-live.tsx` from the references, wrap the dashboard layout\'s children in the provider, and read "The demo\'s limits" before relying on the stream across processes.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'authorized-endpoints',
    since: '0.5.0',
    applies: (root) => matching(root, (rel, src) => (rel === 'app/api/assistant/route.ts' || (isActionsFile(rel) && isServerFile(src))) && !/\bresolveAccess\(/.test(src)),
    summary: 'The assistant route and every actions file resolve the caller before they act.',
    instructions: 'Read "Writes authorize, then invalidate" and "The assistant route" in references/cache.md. Call `resolveAccess()` first in the route and in each Server Action, answer 401 or an error result when there is no session, and hand the assistant only the collections the caller may read. The route passes a guard that authorizes each approved change again when it runs, so `src/lib/assistant/tools.ts` and `src/lib/assistant/respond.ts` take that guard too: bring them over from the release with the route.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'share-view-context',
    since: '0.9.0',
    applies: (root) => matching(root, (_, src) => callArity(src, 'useShareView').some((n) => n === 2)),
    summary: 'useShareView takes one shared context, not a sentence and an object.',
    instructions: 'Read "Legible" in references/agents.md and "A shared context" in references/customize.md. Build the view\'s context with the fields of `SharedContext` from `src/lib/shared-context.ts` (scope, freshness, each figure with its unit, change and definition, what code finds, what the data cannot say) in a pure function beside the view, and pass it alone: `useShareView(context)`. Both agents read it: an MCP host and the console\'s assistant.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'assistant-view-tools',
    since: '0.10.0',
    applies: (root) => {
      const route = text(root, 'app/api/assistant/route.ts');
      const tools = text(root, 'src/lib/assistant/tools.ts');
      const respond = text(root, 'src/lib/assistant/respond.ts');
      if (route === null || tools === null || respond === null) return null;
      // The 0.9.0 assistant takes the views and tells the model its limits; one kept from before does neither.
      const stale = [...(/\bViewTool\b/.test(tools) ? [] : ['src/lib/assistant/tools.ts']), ...(/\blimitsOf\b/.test(respond) ? [] : ['src/lib/assistant/respond.ts']), ...(/\bviews\s*:/.test(route) ? [] : ['app/api/assistant/route.ts'])];
      return stale.length > 0 ? stale : null;
    },
    summary: "The assistant's route-side code predates view tools and its limits.",
    instructions: 'Read "Adding an MCP server later" in example:docs/assistant.md. Bring `src/lib/assistant/tools.ts` and `src/lib/assistant/respond.ts` over from the release: `assistantTools(collections, writer, guard, views)` offers every view in `src/views/tools.ts` as a read-only `view_<name>` tool, `respond` lists what the assistant cannot do or see (`limitsOf`) and passes the views on, and the guard may take a `record`. Then pass `views` from the assistant route to `respond`: the template\'s `viewTools`, an adopted project\'s own view tools (`ViewTool` in `src/lib/shared-context.ts`), or none.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'agent-reads-section',
    since: '0.9.0',
    applies: pagesWithoutAgentReads,
    summary: 'A page under app/(dashboard)/ or app/embed/ says what the agent reads.',
    instructions: 'Read "A page spec" in references/customize.md. Under `## Agents` in the page\'s README.md, add `### What the agent reads`: what the page\'s shared context tells each agent, with a real line of it, and what the MCP App and the console\'s assistant each receive. `scripts/check.ts` requires it.',
    checks: ['gate'],
  },
];

/** The page specifications under the console and embed folders that lack the part the 0.9.0 check requires. */
function pagesWithoutAgentReads(root: string): string[] | null {
  const files: string[] = [];
  for (const d of ['app/(dashboard)', 'app/embed']) walk(root, d, files, /^README\.md$/);
  const hits = files.filter((rel) => !/^## Agents\n[\s\S]*?^### What the agent reads$/m.test(text(root, rel) ?? ''));
  return hits.length > 0 ? hits : null;
}

/** The registry entries that apply to a project moving from `source` to `target`, as journal migrations. */
export function releaseMigrations(root: string, source: string, target: string): Migration[] {
  const out: Migration[] = [];
  for (const m of RELEASE_MIGRATIONS) {
    if (!isNewer(m.since, source) || isNewer(m.since, target)) continue;
    const paths = m.applies(root);
    if (paths) out.push({ id: m.id, summary: m.summary, paths, instructions: m.instructions, checks: m.checks });
  }
  return out;
}
