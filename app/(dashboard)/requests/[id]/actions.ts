'use server';

import { updateTag } from 'next/cache';
import { clock } from '@/data/collections';
import { can, collectionFor, resolveAccess, Unauthenticated } from '@/data/access';
import { collectionTag } from '@/data/read';
import { writesTokens, type RequestRow } from '@/data/sample';

export type ReplayResult = { ok: true; id: string; status: number } | { ok: false; error: string };

/**
 * Sends a logged request again: the same method, route, customer, region and model, as a new request that names the one
 * it replays. A product calls its gateway here with the stored request; the sample's gateway answers a replay of a
 * temporary failure (a 5xx or a 429, the only requests that offer Replay) with the route's success, so where the route
 * calls a model that writes tokens the replay has a first token, which the sample puts two fifths of the way through. Authorized like any
 * write, then the tenant's request reads are refreshed.
 */
export async function replayRequest(id: string): Promise<ReplayResult> {
  try {
    const scope = await resolveAccess();
    if (!(await can(scope, 'requests', 'create'))) return { ok: false, error: 'You do not have permission to replay requests.' };
    const requests = collectionFor(scope, 'requests');
    const original = (await requests.query({ where: [{ field: 'id', op: 'eq', value: id }] })).rows[0] as RequestRow | undefined; // allow-no-direct-query: read() cannot serve this — a server action reads the record it is about to change, uncached
    if (!original) return { ok: false, error: `No request with id ${id}.` };
    const status = original.method === 'POST' ? 201 : 200;
    const replay = await requests.create!({
      at: clock().toISOString(), method: original.method, route: original.route, status, latency: original.latency,
      customer: original.customer, region: original.region, bytes: original.bytes, model: original.model, replayOf: original.id,
      ttft: writesTokens(original.model) ? Math.max(1, Math.round(original.latency * 0.4)) : null,
    });
    updateTag(collectionTag(scope.tenantId, 'requests'));
    return { ok: true, id: String(replay.id), status };
  } catch (e) {
    // Only the answer written for the person: a collection that rejected the record says why in its own words, which are
    // not theirs to read, so anything but the missing session is a sentence this action chose.
    return { ok: false, error: e instanceof Unauthenticated ? 'Sign in again to replay this request.' : 'The request was not replayed.' };
  }
}
