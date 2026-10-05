import { Unauthenticated, can, collectionFor, resolveAccess } from '@/data/access';
import { requestsQuery } from '@/data/requests';
import { csvHeader, csvRow, type CsvRow } from '@/lib/csv';

const BATCH = 100;
const COLUMNS = ['id', 'received', 'method', 'route', 'status', 'latency_ms', 'customer', 'region', 'bytes', 'model'];

const text = (status: number, body: string) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

const line = (r: Record<string, unknown>): CsvRow =>
  ({ id: r.id, received: r.at, method: r.method, route: r.route, status: r.status, latency_ms: r.latency, customer: r.customer, region: r.region, bytes: r.bytes, model: r.model }) as CsvRow;

/**
 * `GET /api/export/requests?<the console's filters>`: every request the caller may read that matches, in the table's
 * order, as CSV. It queries its own authorized collection in batches, uncached as an export must be, and stops once the
 * download is cancelled. 401 without a session, 403 when the caller may not read requests.
 */
export async function GET(request: Request): Promise<Response> {
  const scope = await resolveAccess().catch((e: unknown) => { if (e instanceof Unauthenticated) return null; throw e; });
  if (!scope) return text(401, 'Sign in to continue.');
  if (!(await can(scope, 'requests', 'read'))) return text(403, 'You do not have access to that.');

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { state, query } = requestsQuery(params);
  const collection = collectionFor(scope, 'requests');
  const encoder = new TextEncoder();
  let offset = 0;
  let total = Infinity;
  let cancelled = false;

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (cancelled || request.signal.aborted || offset >= total) {
        if (!cancelled) controller.close();
        return;
      }
      try {
        const batch = await collection.query({ where: query.where, sort: query.sort, limit: BATCH, offset });
        total = batch.total;
        const lines = batch.rows.map((r) => csvRow(COLUMNS, line(r)));
        const head = offset === 0 ? csvHeader(COLUMNS) + '\r\n' : '';
        offset += BATCH;
        controller.enqueue(encoder.encode(head + lines.map((l) => l + '\r\n').join('')));
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() { cancelled = true; },
  });

  const filters = [state.status, state.method.toLowerCase(), state.region].filter((v) => v !== 'all');
  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="requests${filters.length ? `-${filters.join('-')}` : ''}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
