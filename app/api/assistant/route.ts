import { safeValidateUIMessages } from 'ai';
import { revalidateTag } from 'next/cache';
import { assistantConfig } from '@/lib/assistant/config';
import { clock, collections } from '@/data/collections';
import { Unauthenticated, can, collectionFor, resolveAccess } from '@/data/access';
import { collectionTag } from '@/data/read';
import { respond } from '@/lib/assistant/respond';
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

  // The assistant is handed this caller's own collections, only those they may read. A change it proposes is checked
  // again when it runs, against whoever is signed in then, and drops the tenant's cached reads once it has committed.
  const readable = (await Promise.all(collections.map(async (c) => ((await can(scope, c.name, 'read')) ? collectionFor(scope, c.name) : null)))).filter((c) => c !== null);
  const guard = {
    authorize: async (name: string, op: 'create' | 'update' | 'remove', ids?: string[]) => {
      const now = await resolveAccess().catch(() => null);
      // The same person of the same tenant, still permitted: a session that changed hands since the approval is refused.
      return now !== null && now.tenantId === scope.tenantId && now.subjectId === scope.subjectId && can(now, name, op, ids);
    },
    invalidate: (name: string) => revalidateTag(collectionTag(scope.tenantId, name), { expire: 0 }),
  };

  return respond({
    ...config,
    collections: readable,
    // Every view's read-only tool; each reads through `read()`, so it sees only what this caller may read.
    views: viewTools,
    guard,
    now: clock(),
    messages: valid.data,
    page: { path: String(page?.path ?? ''), title: String(page?.title ?? ''), context: String(page?.context ?? ''), text: String(page?.text ?? '') },
  });
}
