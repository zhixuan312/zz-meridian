import { safeValidateUIMessages } from 'ai';
import { revalidateTag } from 'next/cache';
import { nav, refusal } from '@/app.config';
import { assistantConfig } from '@/lib/assistant/config';
import { clock, collections } from '@/data/collections';
import { Unauthenticated, can, collectionFor, may, nameOf, resolveAccess } from '@/data/access';
import { aggregate, collectionTag, read } from '@/data/read';
import { whoCan } from '@/data/roles';
import { respond } from '@/lib/assistant/respond';
import { handedTo } from '@/lib/assistant/scoped';
import type { AgentChange, HandedExplore } from '@/lib/assistant/tools';
import type { AnyCollection } from '@/lib/collection';
import type { ViewTool } from '@/lib/shared-context';
import { viewTools } from '@/views/tools';

/** The panel sends at most the last 100 messages; a larger body than 2 MB is refused before it is parsed. */
const MAX_MESSAGES = 100;
const MAX_BODY = 2_000_000;

/** `POST /api/assistant`: answers about the page the person is on. 401 without a session, 404 until the `ASSISTANT_*` variables are set. */
export async function POST(request: Request): Promise<Response> {
  const scope = await resolveAccess().catch((e: unknown) => { if (e instanceof Unauthenticated) return null; throw e; });
  if (!scope) return new Response(null, { status: 401 });
  const config = assistantConfig(process.env);
  if (!config) return new Response(null, { status: 404 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response(null, { status: 413 });
  const body: unknown = (() => { try { return JSON.parse(raw); } catch { return null; } })();
  const { messages, page } = (body ?? {}) as { messages?: unknown; page?: { path?: unknown; title?: unknown; context?: unknown; text?: unknown } };
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return new Response(null, { status: 400 });
  const valid = await safeValidateUIMessages({ messages });
  if (!valid.success) return new Response(null, { status: 400 });

  // The assistant is handed this caller's own collections, only those they may read, and of those only the operations
  // they may perform, each through `scopedQuery` so its `query` re-checks the person it was handed to at the moment it
  // runs — the same tenant and subject, still permitted to read. Listing a tool is not enforcement: the checks that stop
  // a read or a write are the ones that run at execution.
  const readable = (await Promise.all(collections.map(async (c) => {
    if (!(await can(scope, c.name, 'read'))) return null;
    // A collection bound to this scope: for members, `membersFor(scope)`, so every write passes Task I-14's boundary
    // and the Owner, self and last-active-Owner rules apply to an agent exactly as they do to the page. `handedTo` is
    // where the order lives — the query re-check, the agent's member create, then FR-17's narrowing.
    return await handedTo(scope, collectionFor(scope, c.name), c.name);
  }))).filter((c): c is AnyCollection => c !== null);

  // A view tool is registered only where the person satisfies its feature's need. A view's `read` asks the need again,
  // so filtering the list is presentation, not the gate; both stay.
  const views = (await Promise.all(viewTools.map(async (v) => ((await may(v.needs)) ? v : null)))).filter((v): v is ViewTool => v !== null);

  // The prepared query of the page the person is on, and no other page's: the view whose page the address is, where
  // they may use it. It reads through `aggregate()` and `read()`, which ask the person's grant again when a call runs;
  // its schema offers only what they may read: the collections handed above, without each one's hidden fields.
  const path = pathOf(String(page?.path ?? ''));
  const view = views.find((v) => v.explore && onPage(v.page, path));
  const names = new Set(readable.map((c) => c.name));
  const explore: HandedExplore | undefined = view?.explore && Object.values(view.explore.sources).some((s) => names.has(s.collection))
    ? {
      view,
      rights: { readable: names, hidden: (name) => (readable.find((c) => c.name === name)?.hidden ?? []) as string[] },
      io: { aggregate, read, today: clock().toISOString().slice(0, 10) },
      page: path,
    }
    : undefined;

  // What the prompt says is true of this person. The addresses are the rail's destinations whose need they satisfy, the
  // predicate `chromeAccess().only` draws the rail by, and the detail pages of the views they may use. Under
  // `refusal: 'explain'` it also names each collection not handed above and the roles that can read it, as the page names
  // who can open it; under `absent` it names none, as the page names nothing.
  const open = (await Promise.all(nav.flatMap((g) => g.items).map(async (i) => ((await may(i.needs)) ? [i] : [])))).flat();
  const audience = {
    addresses: [
      ...open.filter((i, n) => open.findIndex((o) => o.href === i.href) === n).map((i) => ({ label: i.label, address: i.href })),
      ...views.filter((v) => /\[[^\]/]+\]/.test(v.page)).map((v) => ({ label: v.title, address: v.page.replace(/\[([^\]/]+)\]/g, '<$1>') })),
    ],
    withheld: refusal === 'explain'
      ? collections.filter((c) => !names.has(c.name)).map((c) => ({ label: c.label, roles: whoCan(`${c.name}:read`) }))
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
    collections: readable,
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

/** Whether `path` is the page `route` renders: each segment equal, a `[name]` segment matching any one segment. */
function onPage(route: string, path: string): boolean {
  const want = route.split('/'), got = path.split('/');
  return want.length === got.length && want.every((w, i) => (/^\[[^\]/]+\]$/.test(w) ? got[i] !== '' : w === got[i]));
}

/** An agent's change as an Activity line: "changed status to Suspended for Alice Moreno and Ravi Patel". */
function activityLine({ label, op, titles, set }: AgentChange): { verb: string; object: string } {
  const names = titles.length <= 3 ? titles.join(titles.length === 2 ? ' and ' : ', ') : `${titles.length} ${label.toLowerCase()}`;
  if (op === 'create') return { verb: 'added', object: `${names} to ${label.toLowerCase()}` };
  if (op === 'remove') return { verb: 'removed', object: `${names} from ${label.toLowerCase()}` };
  const fields = Object.entries(set ?? {}).map(([k, v]) => `${k} to ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(', ');
  return { verb: 'changed', object: `${fields} for ${names}` };
}
