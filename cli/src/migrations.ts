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

/** Where an import of the team's file `rel` points, as a project path with no extension; null for a package. */
const resolvedImport = (rel: string, spec: string): string | null => {
  const bare = spec.replace(/\.[mc]?[jt]sx?$/, '');
  if (bare.startsWith('@/')) return `src/${bare.slice(2)}`;
  return bare.startsWith('.') ? path.posix.join(path.posix.dirname(rel), bare) : null;
};

/** Each import of a file of the team's: the module it resolves to, the names it takes and its namespace, if it has one. */
function importsOf(rel: string, src: string): { from: string; names: string[]; namespace: string | null }[] {
  const out: { from: string; names: string[]; namespace: string | null }[] = [];
  for (const m of src.matchAll(/^\s*import\s+(?:type\s+)?([^'"]*?)\s+from\s+(['"])([^'"]+)\2/gm)) {
    const from = resolvedImport(rel, m[3]!);
    if (from === null) continue;
    const names = (/\{([^}]*)\}/.exec(m[1]!)?.[1] ?? '').split(',').map((s) => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]!).filter(Boolean);
    out.push({ from, names, namespace: /\*\s*as\s+([\w$]+)/.exec(m[1]!)?.[1] ?? null });
  }
  return out;
}

/**
 * The index just past the string, template or comment that starts at `i`, or `i` when none does. A regular expression is
 * not told from a division here: a view tool's object holds none whose brackets or quotes do not balance.
 */
function skipLiteral(src: string, i: number): number {
  const c = src[i], next = src[i + 1];
  if (c === '/' && next === '/') { const e = src.indexOf('\n', i); return e < 0 ? src.length : e; }
  if (c === '/' && next === '*') { const e = src.indexOf('*/', i + 2); return e < 0 ? src.length : e + 2; }
  if (c === "'" || c === '"') {
    let j = i + 1;
    while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
    return j + 1;
  }
  if (c === '`') {
    let j = i + 1;
    while (j < src.length && src[j] !== '`') {
      if (src[j] === '\\') j += 2;
      else if (src[j] === '$' && src[j + 1] === '{') j = closeOf(src, j + 1) + 1;
      else j++;
    }
    return j + 1;
  }
  return i;
}

/** The index of the bracket that closes the `{`, `(` or `[` at `open`, passing over strings and comments. */
function closeOf(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length;) {
    const past = skipLiteral(src, i);
    if (past !== i) { i = past; continue; }
    const c = src[i]!;
    if ('{(['.includes(c)) depth++;
    else if ('})]'.includes(c) && --depth === 0) return i;
    i++;
  }
  return src.length;
}

/**
 * Each `defineViewTool({ … })` call of a file, as the keys of its object's own level, each with its value when that is a
 * string and null otherwise; a key inside a nested object, call or function body, such as an input's `page`, is not
 * the tool's. An object that spreads another has the key `...`, since what it spreads cannot be read here.
 */
function viewToolCalls(src: string): Map<string, string | null>[] {
  const out: Map<string, string | null>[] = [];
  const call = /defineViewTool\s*(?:<[^>]*>)?\s*\(\s*\{/y;
  const key = /(?:async\s+)?([A-Za-z_$][\w$]*)(?:\s*:\s*(['"])((?:\\.|(?!\2)[^\\\n])*)\2)?/y;
  for (let i = 0; i < src.length;) {
    const past = skipLiteral(src, i);
    if (past !== i) { i = past; continue; }
    call.lastIndex = i;
    const m = call.exec(src);
    if (!m || /[\w$.]/.test(src[i - 1] ?? '')) { i++; continue; }
    const open = i + m[0].length - 1;
    const close = closeOf(src, open);
    const keys = new Map<string, string | null>();
    let prev = '{';
    for (let k = open + 1; k < close;) {
      const lit = skipLiteral(src, k);
      if (lit !== k) { k = lit; continue; }
      const c = src[k]!;
      if (/\s/.test(c)) { k++; continue; }
      if (prev === '{' || prev === ',') {
        if (src.startsWith('...', k)) keys.set('...', null);
        key.lastIndex = k;
        const found = key.exec(src);
        if (found && !keys.has(found[1]!)) keys.set(found[1]!, found[3] ?? null);
      }
      if ('{(['.includes(c)) { k = closeOf(src, k) + 1; prev = '}'; continue; }
      prev = c;
      k++;
    }
    out.push(keys);
    i = close + 1;
  }
  return out;
}

// ── The registry ─────────────────────────────────────────────────────────────────────────────────────

const GATE_AND_BUILD = ['gate', 'build'];

/**
 * The thirty-eight modules 0.28.0 moved into `src/logic/`, as the path each left and the path it went to: the figures
 * and sentences that were `src/views/`'s, the status list's summary, and the alerts the dashboard layout reads.
 */
const MOVED_TO_LOGIC: readonly [from: string, to: string][] = [
  ['src/data/alerts.ts', 'src/logic/alerts.ts'],
  ['src/components/patterns/status-list/summarise.ts', 'src/logic/summarise.ts'],
  ...['customer-context', 'customer-explore', 'customers-context', 'customers-explore', 'fact-insight',
    'home-context', 'home-explore', 'home-parts', 'key-scopes', 'keys-context', 'keys-explore', 'main-summary',
    'members-context', 'members-explore', 'now-context', 'now-explore', 'now-parts', 'releases-context',
    'releases-explore', 'request-context', 'request-explore', 'requests-context', 'requests-explore',
    'revenue-context', 'revenue-explore', 'revenue-parts', 'services-context', 'services-explore',
    'tests-context', 'tests-explore', 'tickets-context', 'tickets-explore', 'tools', 'usage-context',
    'usage-explore', 'usage-parts',
  ].map((name): [string, string] => [`src/views/${name}.ts`, `src/logic/${name}.ts`]),
];

/** The paths those modules left, without their extension, as an import resolves them. */
const MOVED_FROM = new Set(MOVED_TO_LOGIC.map(([from]) => from.replace(/\.ts$/, '')));

/** Each moved module as "the path it left → the path it went to", for the migration's instruction. */
const MOVED_LIST = MOVED_TO_LOGIC.map(([from, to]) => `\`${from}\` → \`${to}\``).join(', ');

/** The team's files that import a module from the path the move left behind. */
const importsAMovedModule = (root: string): string[] | null =>
  matching(root, (rel, src) => importsOf(rel, src).some(({ from }) => MOVED_FROM.has(from)));

export const RELEASE_MIGRATIONS: ReleaseMigration[] = [
  {
    id: 'verify-modes',
    since: '0.5.0',
    applies: removedVerifyFlags,
    summary: 'verify has four modes, and --quick, --no-vitals and --extra are gone.',
    instructions: 'Read "Validation" in references/validation.md. Run `pnpm verify` for the bounded default (the gate once, one build, the size checks and a smoke of up to three routes), `pnpm verify --full` for every exhaustive suite, `pnpm verify --timed` for the timed ones (on a quiet machine) and, in CI only, `pnpm verify --perf --shard <i>/<n>` for the 20-sample navigation protocol (`node scripts/perf.ts --routes <route>` narrows it to one route on your machine), and replace the removed flags in the script, workflow or shell file. Read the coverage line each run ends with: it says what ran and what did not.',
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
  {
    id: 'nav-needs',
    since: '0.13.0',
    applies: navItemsWithoutNeeds,
    summary: 'Every item in the project\'s `nav` carries a `needs`, so the rail shows only the destinations a person may reach.',
    instructions: 'Read "5. Decide who may do what" in the Start guide (docs/start-a-dashboard.md). For each item in `src/app.config.ts`\'s `nav`, add `needs: \'public\'` when everyone may open that page, or point it at its feature (`needs: FEATURES.<id>.needs`); the fourth of its four steps covers it, and `scripts/check.ts` fails the project\'s gate, naming the href, on an item without one. `adopt` writes `needs: \'public\'` for a project it sets up from now on.',
    checks: ['gate'],
  },
  {
    id: 'agent-reads-own-group',
    since: '0.15.0',
    applies: ownGroupPagesWithoutAgentReads,
    summary: 'A page under the route group the project keeps its console in says what the agent reads.',
    instructions: 'The gate asked this of pages under `app/(dashboard)/` only; from 0.15.0 it asks it under whatever route group sits at the top of the app folder. Read "A page spec" in references/customize.md. Under `## Agents` in each page\'s README.md listed here, add `### What the agent reads`: what the page\'s shared context tells each agent, with a real line of it, and what the MCP App and the console assistant do with it. A copy of the rule kept in `scripts/check.local.ts` for the project\'s own group can be deleted.',
    checks: ['gate'],
  },
  {
    id: 'refusal-declared',
    since: '0.16.0',
    applies: refusalUndeclared,
    summary: 'The product says what an address a person may not open draws: `refusal` in `src/app.config.ts`.',
    instructions: 'Read "Navigation: `src/app.config.ts`" in references/customize.md. Add `export const refusal: \'explain\' | \'absent\' = \'explain\';` to `src/app.config.ts`, beside `facts`: `explain` keeps the no-access page a refused page draws today, and `absent` answers as an address that names nothing. A project that keeps the sample\'s access seam brings `src/data/access.ts` and `src/data/refusal.ts` over from the release (`gate` reads `refusal`, with `gatedMetadata` and `withheldEntries` beside it, and `gatedLoading` reads it alone), titles each gated page with `export function generateMetadata() { return gatedMetadata(\'<feature>\', { title: \'<its title>\' }); }` in place of a static `metadata`, passes its loading state\'s `name` and `title` through `gatedLoading`, and adds `refusal,` to the config object of `scripts/verify.config.ts`, imported from `../src/app.config.ts`, so `verify --as` expects the page the product chose.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'managed-exports-removed',
    since: '0.16.0',
    applies: removedExportReaders,
    summary: 'A file of the team\'s imports an export the release removed from a managed module: `deviations`, `largest`, `runs` or `weekendRatio` from `src/lib/insight.ts`, or `queryInput` from `src/lib/collection.ts`.',
    instructions: 'The update brought `src/lib/insight.ts` and `src/lib/collection.ts` without them, so each file listed here fails the type check. A file of the sample\'s comes over from the release: the Overview context is Home\'s, `src/views/home-context.ts` (see `sample-pages-renamed`); the assistant reads through `view_<name>` and `explore_<view>` and has no `query_<name>` tools, so bring `src/lib/assistant/tools.ts` and `src/lib/assistant/respond.ts` over and pass `readable`, every collection the person may read, from the assistant route to `respond` beside `collections` (read "Prepared queries" in references/agents.md); and a shipped test that imports one, such as `tests/shared-context.test.tsx` or `tests/collection.test.ts`, comes over as the release has it. A file of your own that still needs one of the functions writes it in that file, from its 0.15.0 source.',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'view-tool-page-explore',
    since: '0.16.0',
    applies: (root) => matching(root, (_, src) => viewToolCalls(src).some((k) => !k.has('...') && !(k.has('page') && k.has('explore')))),
    summary: 'Every view tool names the page it renders and its prepared query: `page` and `explore` on `defineViewTool`.',
    instructions: 'Read "Prepared queries" in references/agents.md. Add to each `defineViewTool` call in the files listed here `page`, the console route of the page the view renders (a rail destination\'s `href` in `nav`, or a detail page\'s route with its segment, such as `/customers/[id]`), and `explore`, its prepared query (`PreparedQuery` in `src/lib/explore.ts`), declared beside the view as the sample\'s are in `src/views/<view>-explore.ts`. `ViewTool` in `src/lib/shared-context.ts` requires both, so a tool without them fails the type check. A project that kept the sample\'s view tools brings `src/views/tools.ts` and the `src/views/*-explore.ts` files over from the release. Once a tool names its page, the gate asks that page\'s specification what the agent does there (`agent-does-here-section`).',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'agent-does-here-section',
    since: '0.16.0',
    applies: viewToolPagesWithoutAgentDoes,
    summary: 'The specification of a page a view tool renders says what the agent does there.',
    instructions: 'Read "Prepared queries" in references/agents.md. Under `## Agents` in the README.md of each page a view tool\'s `page` names, add `### What the agent does here`: a line `Protagonist: <the card\'s name>.`, then at least three questions a person on the page asks that its context does not answer alone, each `- "<question>" — <what the prepared query is asked>`, and mark that card on the page with `data-protagonist="<name>"`. `scripts/check.ts` fails the gate on such a page without the part. While a view tool names no page yet (`view-tool-page-explore`), every console page specification without the part is listed: one that no tool comes to name needs nothing.',
    checks: ['gate'],
  },
  {
    id: 'sample-pages-renamed',
    since: '0.16.0',
    applies: renamedSampleFiles,
    summary: 'The project holds the sample\'s pages and views under their 0.15.0 names: Overview is Home, Analytics is Usage at `/usage` and Operations is Services at `/services`.',
    instructions: 'The release renamed them with no redirect, and an update writes none of the team\'s pages, views or tests. Each file listed is one of them or names one: a page or a view, the view tools, `src/app.config.ts`\'s nav and the feature ids it names, the routes of `scripts/verify.config.ts`, or a shipped test that expects them. A project that kept the sample\'s pages as they were brings the release\'s over: `app/(dashboard)/` and `app/embed/`, `src/views/`, `src/data/`, `src/lib/assistant/` beside `prompt.ts`, `src/app.config.ts` with its own `app` kept, and each shipped test as the release has it; a file listed here that the release no longer has is deleted. A project that made the pages its own keeps its own names, makes the changes this release\'s other migrations list in them, and reads "not applicable" for the assistant walk-through\'s steps on Home and Now (`scripts/lib/sample.ts`).',
    checks: GATE_AND_BUILD,
  },
  {
    id: 'marker-measured-on-observe',
    since: '0.16.2',
    applies: railObserverNeverAnswers,
    summary: 'A test mounts the rail over a `ResizeObserver` whose `observe` answers nothing: the rail takes its first measurement from the observer now, where it took one by hand.',
    instructions: 'Bring `tests/rail-marker.test.tsx` over from the release as it has it. Since 0.16.2 `src/components/patterns/rail/index.tsx` reads no offset of its own — a rail mounts inside the tap that opens the phone drawer, and a read there lays the page out inside that tap — so the marker\'s first position is the one `observe` delivers, after the effect that called it. A test whose fake answers `observe` with an empty body expects the marker before any delivery and fails; the release\'s fake answers it with the callback, `observe() { for (const cb of observers) queueMicrotask(cb); }`, and reads the marker after that delivery. A test of your own that mounts the rail changes the same way.',
    checks: ['gate'],
  },
  {
    id: 'view-page-matched-as-next',
    since: '0.16.3',
    applies: (root) => (/\bfunction onPage\s*\(/.test(text(root, 'app/api/assistant/route.ts') ?? '') ? ['app/api/assistant/route.ts'] : null),
    summary: 'The assistant route finds the view of the page a person is on with `viewAt` from `src/lib/shared-context.ts`, which matches a catch-all `page` as Next.js does.',
    instructions: 'In `app/api/assistant/route.ts`, delete the local `onPage` and find the view with `viewAt` from `@/lib/shared-context`: `const at = viewAt(viewTools, path); const view = at && views.includes(at) ? at : undefined;`, where `views` are the view tools the person may use. `onPage` matched a `[...name]` segment as one segment and a `[[...name]]` never, so a view whose `page` is a catch-all (`/docs/[...path]`) was handed its prepared query at one depth only. `viewAt` matches as Next.js does — `[...name]` one or more segments, `[[...name]]` zero or more — and where two views match one address it takes the one Next.js renders, before asking whether the person may use it, so a less specific view never stands in for the page.',
    checks: ['gate'],
  },
  {
    id: 'journey-moved',
    since: '0.16.3',
    applies: (root) => matching(root, (rel, src) => importsOf(rel, src).some(({ from, names, namespace }) => from === 'scripts/navigate' && (namespace !== null || names.some((n) => n !== 'workspaceHomes')))),
    summary: 'The navigation journey moved from `scripts/navigate.ts` to `scripts/lib/journey.ts`, which keeps every source file Meridian ships under 700 lines.',
    instructions: 'Bring `tests/navigate-start.test.ts` and `tests/navigate-menu-start.test.ts` over from the release as it has them. A file of your own that imports the journey — `startFor`, `journeyStart`, `journey`, `drawerRoutes`, `prepare`, `liveRefresh`, `Fail` and the types `Device`, `Metric`, `Condition`, `Measured`, `Sample` and `NavConfig` — imports it from `scripts/lib/journey.ts` instead; `scripts/navigate.ts` keeps the command and `workspaceHomes` only.',
    checks: ['gate'],
  },
  {
    id: 'today-in-timezone',
    since: '0.16.3',
    applies: (root) => matching(root, (rel, src) => (rel === 'app/api/assistant/route.ts' || rel === 'src/data/metrics.ts') && /\bconst today = clock\(\)\.toISOString\(\)\.slice\(0, 10\)|\btoday: clock\(\)\.toISOString\(\)\.slice\(0, 10\)/.test(src)),
    summary: "Today is the day in `app.timezone` wherever a day is cut: `dayOf(clock())` from `src/lib/format-date.ts`, not the UTC date.",
    instructions: "Replace `clock().toISOString().slice(0, 10)` with `dayOf(clock())` (`dayOf` in `src/lib/format-date.ts`) in each file listed: the prepared query's `today` in `app/api/assistant/route.ts`, and `readDays`'s today in `src/data/metrics.ts`. The prompt has told the model today in `app.timezone` all along, while the prepared query and the page cut their periods at the UTC date, so east of UTC after local midnight (west of UTC in the evening) the model's today and its `7d` window's end were a day apart. A day row is kept under its day in `app.timezone`, so a file of your own that compares an instant's day with one — `now.slice(0, 10)`, `at.slice(0, 10)` — asks `dayOf` too. A product whose `app.timezone` is UTC sees no change. A project that kept the sample's views brings `src/views/now-parts.ts`, `src/views/revenue-parts.ts`, `src/views/customer-context.ts`, `src/views/customer.tsx` and `src/views/members.tsx` over from the release.",
    checks: ['gate'],
  },
  {
    id: 'verify-tiers',
    since: '0.17.0',
    applies: (root) => matching(root, (rel, src) => importsOf(rel, src).some(({ from, names }) => from === 'scripts/lib/coverage' && names.includes('finalOutcome')) && /(?<![\w.$])finalOutcome\(\s*(?!\{)/.test(src)),
    summary: '`finalOutcome` in `scripts/lib/coverage.ts` takes `{ full, timed }` as its first argument, because verify has a timed tier apart from the full one.',
    instructions: 'Bring `tests/verify-suite-outcome.test.ts` over from the release as it has it. A file of your own that calls `finalOutcome` passes the tiers, `finalOutcome({ full, timed }, notRun)`, where it passed whether the run was full (`finalOutcome(true, notRun)`): `references/validation.md` describes the tiers, `pnpm verify`, `--full` and `--timed`.',
    checks: ['gate'],
  },
  {
    id: 'no-data-mark',
    since: '0.19.0',
    applies: (root) => matching(root, (rel, src) => importsOf(rel, src).some(({ from }) => from === 'src/components/charts/column-chart') && /\.bg-fill-track['"]\)\)\.not\.toBeNull\(\)/.test(src)),
    summary: 'A Column chart\'s period with no data draws a dashed hairline on the baseline, where it drew a `fill-track` track the height of the scale.',
    instructions: 'Bring `tests/column-chart-no-data.test.tsx` over from the release as it has it. Since 0.19.0 `src/components/charts/column-chart/index.tsx` draws no column for a `null` period: its box has no height, a dashed hairline (`data-no-data-mark`) keeps the slot, and the word stands over it, because the track was the tallest mark on the chart. A test of your own that finds `.bg-fill-track` or `[data-track]` in a no-data column finds `[data-no-data-mark]` instead.',
    checks: ['gate'],
  },
  {
    id: 'table-grid',
    since: '0.26.0',
    applies: (root) => matching(root, (rel, src) => importsOf(rel, src).some(({ from }) => from === 'src/components/ui/table' || from === 'src/components/patterns/data-table') && (/@min-\[672px\]:min-w-64/.test(src) || /<TableCell\b[^>]*\bcolSpan\s*=/.test(src))),
    summary: 'A table is a grid since 0.26.0: its spare width sits in the gaps, a `grow` column\'s floor is 160px at every width, and a cell spans no columns.',
    instructions: 'Bring `tests/table-cut-cell.test.tsx` over from the release as it has it. Since 0.26.0 `src/components/ui/table/index.tsx` lays a table out as a grid whose rows are subgrids: every column is as wide as its content, the spare is shared equally between the gaps, and a `grow` column\'s floor is `min-w-40` at every width, without the `@min-[672px]:min-w-64` it had from a 672px table. A test of your own that expects that class expects `min-w-40` alone. A `TableCell` of your own with a `colSpan` takes one track of the grid, so it draws in the first column only: a row that should run the width of the table, such as an empty state, is drawn outside the table, or as a `DataTable` `empty`.',
    checks: ['gate'],
  },
  {
    id: 'four-layers',
    since: '0.28.0',
    applies: importsAMovedModule,
    summary: "The template's figures and sentences moved into `src/logic/`: thirty-eight modules left `src/views/` and `src/data/`.",
    instructions: `Read "The four layers" and "The path an existing product follows" in references/data-layers.md. Thirty-eight modules moved into the logic layer, and each import of one in your own \`src/views/\` producers and pages names the path it left: ${MOVED_LIST}. Rewrite each import to the path the module has now, or move your own module beside the work it does. Doing nothing leaves your tree building, because every path your own files name is still there: the move is in this template, not in your project. The six layer rules stay off until your own \`scripts/check.local.ts\` exports \`fourLayers = true\`; turn them on once your figures have moved, and the gate and the build are what show the work is done.`,
    checks: GATE_AND_BUILD,
  },
];

/**
 * A test of the rail that stands over a fake `ResizeObserver` answering `observe` with nothing (0.16.2). The lookbehind
 * keeps `unobserve() {}` out of it: a fake that answers the callback and also stubs `unobserve` is the release's own
 * shape, and the one thing to bring over.
 */
function railObserverNeverAnswers(root: string): string[] | null {
  return matching(root, (rel, src) => /\.(?:test|spec)\.tsx?$/.test(rel) && /\bRail\b/.test(src) && /\bResizeObserver\b/.test(src) && /(?<![\w$.])observe\s*\(\s*\)\s*\{\s*\}/.test(src));
}

/** The team's files that import an export 0.16.0 removed from a managed module, by name or through a namespace. */
function removedExportReaders(root: string): string[] | null {
  const removed: Record<string, string[]> = { 'src/lib/insight': ['deviations', 'largest', 'runs', 'weekendRatio'], 'src/lib/collection': ['queryInput'] };
  return matching(root, (rel, src) => importsOf(rel, src).some(({ from, names, namespace }) => {
    const gone = removed[from] ?? [];
    return names.some((n) => gone.includes(n)) || (namespace !== null && gone.some((g) => new RegExp(`(?<![\\w$.])${namespace.replace(/\$/g, '\\$')}\\.${g}\\b`).test(src)));
  }));
}

/**
 * The specifications of the pages the view tools render, as the gate reads them from 0.16.0, that lack "What the agent
 * does here". The registry is `src/views/tools.ts`, and a tool may be defined in any module under `src/` it imports, as
 * the gate reads them since 0.17.0, so every `src/` module is read. While a tool names no page, the gate cannot tell its
 * page, and neither can this: every console page specification without the part is listed then.
 */
function viewToolPagesWithoutAgentDoes(root: string): string[] | null {
  if (text(root, 'src/views/tools.ts') === null) return null;
  const calls = teamSources(root).filter((f) => f.rel.startsWith('src/')).flatMap((f) => viewToolCalls(f.src)).filter((k) => !k.has('...'));
  if (calls.length === 0) return null;
  const pages = new Set(calls.map((k) => k.get('page')).filter((p): p is string => typeof p === 'string'));
  const unnamed = calls.some((k) => !k.has('page'));
  const app = fs.existsSync(path.join(root, 'app')) ? 'app' : 'src/app';
  const specs: string[] = [];
  walk(root, app, specs, /^README\.md$/);
  const hits = specs.filter((rel) => {
    const rest = rel.slice(app.length + 1);
    if (!/^\([^/)]+\)\//.test(rest)) return false;
    const route = `/${path.posix.dirname(rest).split('/').filter((s) => !/^\(.*\)$/.test(s)).join('/')}`;
    return (unnamed || pages.has(route)) && !/^## Agents$(?:\n(?!## ).*)*\n### What the agent does here$/m.test(text(root, rel) ?? '');
  });
  return hits.length > 0 ? hits : null;
}

/**
 * The sample's pages and views under the names 0.16.0 replaced, and every file of the team's that names one: an import
 * of one of their modules, a feature id or view tool of theirs, the walk-through's surfaces as they were, and the
 * verify config's routes for them. Only a project that still holds one of the sample's old files is read, so a page of
 * a product's own at the same address, or a feature of its own of the same name, is never taken for the sample's. The
 * names are put together from their parts: the repository holds them out of everything but its history.
 */
function renamedSampleFiles(root: string): string[] | null {
  const old = ['overview', 'analytics', 'health'];
  const modules = new Set([...old.flatMap((n) => [`src/views/${n}`, `src/views/${n}-context`]), `src/data/${old[1]}`]);
  const group = `(${old[0]})`;
  const named = new RegExp(`\\b(?:FEATURES\\.|view_)(?:${old.join('|')})\\b`);
  const isOld = (rel: string) => modules.has(rel.replace(/\.[mc]?[jt]sx?$/, '')) || (/^(?:src\/)?app\//.test(rel) && rel.split('/').includes(group));
  const sources = teamSources(root);
  if (!sources.some((f) => isOld(f.rel))) return null;
  const seeds = sources.filter(({ rel, src }) => isOld(rel)
    || importsOf(rel, src).some((i) => modules.has(i.from))
    || named.test(src)
    || (/\bsampleSurfaces\b/.test(src) && new RegExp(`\\b${old[0]}\\s*:|\\.${old[0]}\\b`).test(src))).map((f) => f.rel);
  // A page or an embed view of the sample's goes with its folder: its loading state and its specification name nothing
  // of the old, and are as much the sample's. A file that imports one of the old files, such as a test that renders the
  // page, names it too; a file that only names one, such as the configuration, is not itself the old.
  const oldFiles = new Set(sources.map((f) => f.rel).filter(isOld));
  const pages = sources.filter(({ rel, src }) => /^(?:src\/)?app\//.test(rel) && /^(?:page|view)\.tsx?$/.test(base(rel)) && (isOld(rel) || importsOf(rel, src).some((i) => modules.has(i.from))));
  for (const { rel } of pages) {
    const dir = path.posix.dirname(rel);
    try {
      for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) if (e.isFile()) oldFiles.add(`${dir}/${e.name}`);
    } catch { /* gone since it was read */ }
  }
  const oldPaths = new Set([...oldFiles].map((r) => r.replace(/\.[mc]?[jt]sx?$/, '')));
  const found = new Set([...seeds, ...oldFiles]);
  for (const { rel, src } of sources) if (importsOf(rel, src).some((i) => oldPaths.has(i.from))) found.add(rel);
  const hits = [...found].sort();
  const verifyConfig = 'scripts/verify.config.ts';
  const routes = new RegExp(`'/(?:${old[1]}|${old[2]})'|title:\\s*'(?:Overview|Analytics|Operations)'`);
  if (routes.test(text(root, verifyConfig) ?? '')) hits.push(verifyConfig);
  return hits;
}

/** The project's configuration, when it does not yet say what an address a person may not open draws (0.16.0). */
function refusalUndeclared(root: string): string[] | null {
  const rel = 'src/app.config.ts';
  const body = text(root, rel);
  if (body === null) return null;
  return /^export const refusal\b/m.test(body) ? null : [rel];
}

/** The nav item objects of a nav array, by brace: an object naming an `href` of its own, however many lines it is over. Braces inside a quoted value are not braces. */
function navItemObjects(nav: string): string[] {
  const found: string[] = [];
  const open: number[] = [];
  let quote: string | null = null;
  for (let i = 0; i < nav.length; i++) {
    const ch = nav[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '{') open.push(i);
    else if (ch === '}') {
      const start = open.pop();
      if (start === undefined) continue;
      const inner = nav.slice(start + 1, i);
      // What is left once the objects inside it are taken out: a group's `href`s are all in its items, so a group has
      // none of its own left and is not an item.
      if (/\bhref\s*:/.test(inner.replace(/\{[^{}]*\}/g, ''))) found.push(inner);
    }
  }
  return found;
}

/** The project's own nav, with any item still missing the `needs` that 0.13.0 requires of it. */
function navItemsWithoutNeeds(root: string): string[] | null {
  const rel = 'src/app.config.ts';
  const body = text(root, rel);
  if (body === null) return null;
  const nav = /export const nav\b[^=]*=\s*\[([\s\S]*?)\n\];/.exec(body)?.[1];
  if (nav === undefined) return null;
  // The item is the object naming its `href`, read by its braces rather than by its line: a team that spreads an item
  // over its keys put the `needs` two lines below the `href`, and a line-based read reported the migration for a file
  // with none of the old shape left in it. A group is not a destination and carries no `needs`: its own `href`s belong
  // to the items inside it, so an object whose braces hold only other objects is not read. Anything the file does
  // beyond that is the team's own shape, and none of it is read.
  const items = navItemObjects(nav);
  // A project of 0.12.3's vintage also declares `NavItem` itself, without the property: an item that names a `needs` its
  // own type does not have is the type error the gate prints next, so the change is not done until the type carries it.
  const declaredType = /export type NavItem[^;]*\};/.test(body);
  const typeHasNeeds = /export type NavItem[^;]*\bneeds\s*:/.test(body);
  return items.some((item) => !/\bneeds\s*:/.test(item)) || (declaredType && !typeHasNeeds) ? [rel] : null;
}

/**
 * The page specifications under a route group of the project's own, at the top of its app folder, that lack the part the
 * gate asks for there from 0.15.0. The template's `(dashboard)` is left out: the rule has covered it since 0.9.0.
 */
function ownGroupPagesWithoutAgentReads(root: string): string[] | null {
  const files: string[] = [];
  for (const app of ['app', 'src/app']) {
    let groups: string[] = [];
    try { groups = fs.readdirSync(path.join(root, app), { withFileTypes: true }).filter((e) => e.isDirectory() && /^\(.+\)$/.test(e.name) && e.name !== '(dashboard)').map((e) => e.name); } catch { /* no such folder */ }
    for (const g of groups) walk(root, `${app}/${g}`, files, /^README\.md$/);
  }
  const hits = files.filter((rel) => !/^## Agents\n[\s\S]*?^### What the agent reads$/m.test(text(root, rel) ?? ''));
  return hits.length > 0 ? hits : null;
}

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
