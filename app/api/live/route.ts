import { Unauthenticated, can, collectionFor, resolveAccess } from '@/data/access';
import { liveStream } from '@/data/live-stream';

const MAX_NAMES = 50;
const NAME = /^[A-Za-z0-9_-]{1,64}$/;

const text = (status: number, body: string) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

/** `name:revision,...` into a map; `undefined` when absent, `null` when a pair has no `:`, an empty part or an unnamed collection. */
function parseSince(raw: string | null, names: string[]): Record<string, string> | undefined | null {
  if (raw === null) return undefined;
  const served: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const at = pair.indexOf(':');
    const name = pair.slice(0, at);
    const revision = pair.slice(at + 1);
    if (at < 1 || !revision || !names.includes(name)) return null;
    served[name] = revision;
  }
  return served;
}

/** `GET /api/live?collections=members,keys`: change hints for the collections the caller may read; `since=members:<revision>` makes the first frame name only what moved. 400 malformed, 401 without a session, 403 for any name they may not read. */
export async function GET(request: Request): Promise<Response> {
  const scope = await resolveAccess().catch((e: unknown) => { if (e instanceof Unauthenticated) return null; throw e; });
  if (!scope) return text(401, 'Sign in to continue.');

  const raw = new URL(request.url).searchParams.get('collections');
  const parts = raw ? raw.split(',') : [];
  if (parts.length === 0 || !parts.every((n) => NAME.test(n))) return text(400, 'Name the collections to follow.');
  const names = [...new Set(parts)];
  if (names.length > MAX_NAMES) return text(400, 'Name the collections to follow.');

  const served = parseSince(new URL(request.url).searchParams.get('since'), names);
  if (served === null) return text(400, 'Name the revisions as name:revision.');

  // An unknown name and a forbidden one answer alike, so neither is disclosed.
  if (!(await Promise.all(names.map((n) => can(scope, n, 'read')))).every(Boolean)) return text(403, 'You do not have access to that.');

  return liveStream({
    names,
    collections: names.map((n) => collectionFor(scope, n)),
    since: served,
    signal: request.signal,
    authorize: async (name) => {
      const now = await resolveAccess().catch(() => null);
      return now !== null && now.tenantId === scope.tenantId && now.subjectId === scope.subjectId && can(now, name, 'read');
    },
  });
}
