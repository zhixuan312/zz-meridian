'use server';

import { updateTag } from 'next/cache';
import { clock } from '@/data/collections';
import { can, collectionFor, resolveAccess, Unauthenticated } from '@/data/access';
import { collectionTag } from '@/data/read';
import type { RequestRow } from '@/data/sample';

export type ReplayResult = { ok: true; id: string; status: number } | { ok: false; error: string };

/**
 * Sends a logged request again: the same method, route, customer, region and model, as a new request that names the one
 * it replays. A product calls its gateway here with the stored request; the sample's gateway answers a replay of a
 * temporary failure (a 5xx or a 429, the only requests that offer Replay) with the route's success. Authorized like any
 * write, then the tenant's request reads are refreshed.
 */
export async function replayRequest(id: string): Promise<ReplayResult> {
  try {
    const scope = await resolveAccess();
    if (!(await can(scope, 'requests', 'create'))) return { ok: false, error: 'You do not have permission to replay requests.' };
    const requests = collectionFor(scope, 'requests');
    const original = (await requests.query({ where: [{ field: 'id', op: 'eq', value: id }] })).rows[0] as RequestRow | undefined;
    if (!original) return { ok: false, error: `No request with id ${id}.` };
    const status = original.method === 'POST' ? 201 : 200;
    const replay = await requests.create!({
      at: clock().toISOString(), method: original.method, route: original.route, status, latency: original.latency,
      customer: original.customer, region: original.region, bytes: original.bytes, model: original.model, replayOf: original.id,
    });
    updateTag(collectionTag(scope.tenantId, 'requests'));
    return { ok: true, id: String(replay.id), status };
  } catch (e) {
    return { ok: false, error: e instanceof Unauthenticated ? 'Sign in again to replay this request.' : e instanceof Error ? e.message : 'The request was not replayed.' };
  }
}
