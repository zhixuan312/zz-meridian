import { safeValidateUIMessages } from 'ai';
import { revalidateTag } from 'next/cache';
import { nav, refusal, type NavItem } from '@/app.config';
import { assistantConfig } from '@/lib/assistant/config';
import { clock, collections } from '@/data/collections';
import { Unauthenticated, can, collectionFor, may, nameOf, resolveAccess } from '@/data/access';
import { ACTIONS, FEATURES, type FeatureId } from '@/data/features';
import { aggregate, collectionTag, read } from '@/data/read';
import { whoCan } from '@/data/roles';
import { respond } from '@/lib/assistant/respond';
import { handedTo } from '@/lib/assistant/scoped';
import type { AgentChange, HandedExplore } from '@/lib/assistant/tools';
import type { AnyCollection, Grant, Need } from '@/lib/collection';
import type { PreparedQuery } from '@/lib/explore';
import { dayOf } from '@/lib/format-date';
import { viewAt, type ViewTool } from '@/lib/shared-context';
import { viewTools } from '@/logic/tools';

/** The panel sends at most the last 100 messages; a larger body than 2 MB is refused before it is parsed. */
const MAX_MESSAGES = 100;
const MAX_BODY = 2_000_000;

/**
 * `POST /api/assistant`: answers about the page the person is on. 401 without a session, 404 until the `ASSISTANT_*`
 * variables are set, 409 when the thread was started for another person or tenant.
 */
export async function POST(request: Request): Promise<Response> {
  const scope = await resolveAccess().catch((e: unknown) => { if (e instanceof Unauthenticated) return null; throw e; });
  if (!scope) return new Response(null, { status: 401 });
  const config = assistantConfig(process.env);
  if (!config) return new Response(null, { status: 404 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response(null, { status: 413 });
  const body: unknown = (() => { try { return JSON.parse(raw); } catch { return null; } })();
  const { messages, page, scope: started } = (body ?? {}) as { messages?: unknown; page?: { path?: unknown; title?: unknown; context?: unknown; text?: unknown }; scope?: unknown };
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return new Response(null, { status: 400 });
  // The panel names the scope its thread was started for. A thread of another person or tenant (a sign-in from another
  // tab since) is never answered for this one: nothing of it reaches the model, and the panel clears it on the 409.
  if (started !== undefined && started !== `${scope.tenantId}/${scope.subjectId}`) {
    return new Response('You are signed in as someone else now, so the earlier conversation was cleared. Ask again.', { status: 409, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  const valid = await safeValidateUIMessages({ messages });
  if (!valid.success) return new Response(null, { status: 400 });

  // This caller's own collections, only those they may read, and of those only the operations they may perform. The
  // assistant reads none of them directly: it reads through the view tools and the page's prepared query, which ask the
  // grant again when they run. Listing a tool is not enforcement: the checks that stop a read or a write are the ones
  // that run at execution.
  const readable = (await Promise.all(collections.map(async (c) => {
    if (!(await can(scope, c.name, 'read'))) return null;
    // A collection bound to this scope: for members, `membersFor(scope)`, so every write passes Task I-14's boundary
    // and the Owner, self and last-active-Owner rules apply to an agent exactly as they do to the page. `handedTo` is
    // where the order lives — the agent's member create, then FR-17's narrowing.
    return await handedTo(scope, collectionFor(scope, c.name), c.name);
  }))).filter((c): c is AnyCollection => c !== null);

  // A view tool is registered only where the person satisfies its feature's need. A view's `read` asks the need again,
  // so filtering the list is presentation, not the gate; both stay.
  const views = (await Promise.all(viewTools.map(async (v) => ((await may(v.needs)) ? v : null)))).filter((v): v is ViewTool => v !== null);

  // The prepared query of the page the person is on, and no other page's: the view whose page the address is, where
  // they may use it. It reads through `aggregate()` and `read()`, which ask the person's grant again when a call runs;
  // its schema offers only what they may read: the collections handed above, without each one's hidden fields.
  const path = pathOf(String(page?.path ?? ''));
  const at = viewAt(viewTools, path);
  const view = at && views.includes(at) ? at : undefined;
  const names = new Set(readable.map((c) => c.name));
  const reads = new Set(view ? Object.values(view.explore.sources).map((s) => s.collection) : []);
  const explore: HandedExplore | undefined = view && [...reads].some((name) => names.has(name))
    ? {
      view,
      rights: { readable: names, hidden: (name) => (readable.find((c) => c.name === name)?.hidden ?? []) as string[] },
      io: { aggregate, read, today: dayOf(clock()) },
      page: path,
    }
    : undefined;

  // What the prompt says is true of this person. The addresses are the rail's destinations whose need they satisfy, the
  // predicate `chromeAccess().only` draws the rail by, and the detail pages of the views they may use. Under
  // `refusal: 'explain'` it also names each collection not handed above, the roles that can read it, as the page names
  // who can open it, every page whose prepared query reads it or whose declared grants read it (`declared`), with
  // whether this person may open that page, and the figures worked out from it: compute cost is on Home, which a Viewer
  // opens without it, and gross margin is worked out from it. Under `absent` it names none, as the page names nothing.
  const open = (await Promise.all(nav.flatMap((g) => g.items).map(async (i) => ((await may(i.needs)) ? [i] : [])))).flat();
  const audience = {
    addresses: [
      ...open.filter((i, n) => open.findIndex((o) => o.href === i.href) === n).map((i) => ({ label: i.label, address: i.href })),
      ...views.filter((v) => /\[[^\]/]+\]/.test(v.page)).map((v) => ({ label: v.title, address: v.page.replace(/\[([^\]/]+)\]/g, '<$1>') })),
    ],
    withheld: refusal === 'explain'
      ? collections.filter((c) => !names.has(c.name)).map((c) => {
        const holding = viewTools.filter((v) => Object.values(v.explore.sources).some((s) => s.collection === c.name));
        // A rail page that declares that read holds it too, though no view's prepared query reads it: Settings reads the
        // workspace for Save workspace.
        const own = nav.flatMap((g) => g.items).filter((i) => declared(i).includes(`${c.name}:read`) && !holding.some((v) => v.page === i.href));
        const pages = [
          ...holding.map((v) => ({ label: v.title, address: v.page.replace(/\[([^\]/]+)\]/g, '<$1>'), open: views.includes(v) })),
          ...own.map((i) => ({ label: i.label, address: i.href, open: open.includes(i) })),
        ];
        const derived = [...new Set(holding.flatMap((v) => workedFrom(v.explore, c.name)))];
        // Who may make each change, apart from who may read it: a Member reads keys and creates none.
        const changes = (['create', 'update', 'remove'] as const).map((op) => ({ op, roles: whoCan(`${c.name}:${op}`) })).filter((x) => x.roles.length);
        return { label: c.label, roles: whoCan(`${c.name}:read`), ...(changes.length ? { changes } : {}), ...(pages.length ? { pages } : {}), ...(derived.length ? { derived } : {}) };
      })
      : undefined,
  };

  const guard = {
    authorize: async (name: string, op: 'create' | 'update' | 'remove', ids?: string[]) => {
      const now = await resolveAccess().catch(() => null);
      // The same person of the same tenant, still permitted: a session that changed hands since the approval is refused.
      return now !== null && now.tenantId === scope.tenantId && now.subjectId === scope.subjectId && can(now, name, op, ids);
    },
    invalidate: (name: string) => revalidateTag(collectionTag(scope.tenantId, name), { expire: 0 }),
    // Provenance (decision 0011): an approved change leaves an Activity line naming the agent and the person it acted
    // for. Only where the product keeps activity and the person may add to it; the change stands either way.
    record: async (change: AgentChange) => {
      if (!(await can(scope, 'activity', 'create'))) return;
      await collectionFor(scope, 'activity').create!({ at: clock().toISOString(), actor: (await nameOf(scope)) ?? 'You', via: 'Assistant', ...activityLine(change) });
      revalidateTag(collectionTag(scope.tenantId, 'activity'), { expire: 0 });
    },
  };

  return respond({
    ...config,
    // The write tools are those of the collections the page's prepared query reads, so a page offers the changes of what
    // it shows and its drill hands the ids; a page with no view offers none. A change another page makes is not a tool
    // here, and the prompt tells the model to give that page's address. The limits are said over every collection the
    // person may read, so the assistant can still say why a change is not one it can make.
    collections: readable.filter((c) => reads.has(c.name)),
    readable,
    // Every view tool this caller may use; each reads through `read()`, so it sees only what this caller may read.
    views,
    explore,
    guard,
    audience,
    now: clock(),
    messages: valid.data,
    page: { path: String(page?.path ?? ''), title: String(page?.title ?? ''), context: String(page?.context ?? ''), text: String(page?.text ?? '') },
  });
}

/** The address the panel sends without its query or fragment, and without a trailing slash: `/usage?period=7d` is `/usage`. */
function pathOf(address: string): string {
  const path = address.split(/[?#]/)[0];
  return (path.length > 1 ? path.replace(/\/+$/, '') : path) || '/';
}

/** The grants a need names: the one, every one of an `allOf`, and none for `public`. */
const grantsOf = (need: Need): readonly Grant[] => (need === 'public' ? [] : typeof need === 'string' ? [need] : need.allOf);

/**
 * The grants a rail page declares: its feature's need and the need of every action the features table puts on that
 * feature. An item is the feature it names (`feature`), else the one feature whose need it points at by reference
 * (`src/app.config.ts`); an item whose need several features share and that names none declares only its need.
 */
function declared(item: NavItem): Grant[] {
  const ids = (Object.keys(FEATURES) as FeatureId[]).filter((f) => FEATURES[f].needs === item.needs);
  const named = item.feature !== undefined && Object.hasOwn(FEATURES, item.feature) ? [item.feature as FeatureId] : [];
  const own = named.length ? named : ids.length === 1 ? ids : [];
  return [...grantsOf(item.needs), ...Object.values(ACTIONS).filter((a) => own.includes(a.feature)).flatMap((a) => grantsOf(a.needs))];
}

/**
 * The labels of the derived measures of `query` that read a source over `collection`, directly or through another
 * derived measure: Home's gross margin is worked out from what compute cost. A reference `<source>.<measure>` names a
 * measure of another source, as the runner reads it.
 */
function workedFrom(query: PreparedQuery<never>, collection: string): string[] {
  const reads = (source: string, measure: string, seen: string[] = []): boolean => {
    const s = query.sources[source];
    const m = s?.measures[measure];
    if (!m || seen.includes(`${source}.${measure}`)) return false;
    if (!('derive' in m)) return s.collection === collection;
    return m.of.some((ref) => {
      const dot = ref.indexOf('.');
      const [src, name] = dot > 0 && query.sources[ref.slice(0, dot)] ? [ref.slice(0, dot), ref.slice(dot + 1)] : [source, ref];
      return reads(src, name, [...seen, `${source}.${measure}`]);
    });
  };
  return Object.entries(query.sources).flatMap(([source, s]) => Object.entries(s.measures).filter(([name, m]) => 'derive' in m && reads(source, name)).map(([, m]) => m.label));
}

/** An agent's change as an Activity line: "changed status to Suspended for Alice Moreno and Ravi Patel". */
function activityLine({ label, op, titles, set }: AgentChange): { verb: string; object: string } {
  const names = titles.length <= 3 ? titles.join(titles.length === 2 ? ' and ' : ', ') : `${titles.length} ${label.toLowerCase()}`;
  if (op === 'create') return { verb: 'added', object: `${names} to ${label.toLowerCase()}` };
  if (op === 'remove') return { verb: 'removed', object: `${names} from ${label.toLowerCase()}` };
  const fields = Object.entries(set ?? {}).map(([k, v]) => `${k} to ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(', ');
  return { verb: 'changed', object: `${fields} for ${names}` };
}
