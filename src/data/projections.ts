/**
 * What a record becomes when a page hands it to a client component. A read answers with the collection's own row — a
 * `Record<string, unknown>` — and passing it on whole would publish whatever the row happens to hold: the key's
 * `secretHash` today, and any field the collection gains tomorrow. Each projection below builds its object field by
 * field from that row, so the public shape is the one written here and nothing else. An added field is refused for the
 * same reason: no line reads it.
 *
 * A projection invents no field and defends against no row. The row it is given is one the collection served — a
 * record the collection cannot serve is refused before a projection is reached. Values the read joins on the server
 * (`assignee`, `release`, `verification`) are attached to the row by that read and copied here one field at a time; a
 * row handed without one projects it as absent, because a projection cannot know it. `read()` keeps answering with
 * the collection's rows, so no read signature changes: this is the one seam where a row is made public.
 */
import type { ApiKey, Member, Release, RequestRow, Ticket, VerificationRun } from '@/data/sample';
import type { ReleaseRow, RunRow } from '@/data/engineering';
import type { TicketRow } from '@/data/tickets';
import type { Verification } from '@/data/verification';

/** A key as a browser receives it: the record without the hash a request is checked against. */
export type PublicKey = Omit<ApiKey, 'secretHash'>;

/** The key's eight public fields, each read by name. `secretHash` has no line here, so it is never published. */
export function projectKey(row: Record<string, unknown>): PublicKey {
  return {
    id: row.id as string,
    name: row.name as string,
    hint: row.hint as string,
    owner: row.owner as string,
    created: row.created as string,
    lastUsed: (row.lastUsed ?? null) as string | null,
    scopes: [...(row.scopes as string[])],
    env: row.env as 'live' | 'test',
  };
}

/** The person's record, with the role, add-ons, team and status a page draws. */
export function projectMember(row: Record<string, unknown>): Member {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as Member['role'],
    addOns: [...(row.addOns as Member['addOns'])],
    team: row.team as Member['team'],
    status: row.status as Member['status'],
    joined: row.joined as string,
    lastActive: (row.lastActive ?? null) as string | null,
  };
}

/**
 * The ticket's record, with the assignee's name the read joined on the server. A Viewer may read tickets and not
 * members, so the name is the only part of the roster that leaves the server: `assigneeId` stays as the record holds it.
 */
export function projectTicket(row: Record<string, unknown>): TicketRow {
  return {
    id: row.id as string,
    title: row.title as string,
    service: row.service as string,
    priority: row.priority as Ticket['priority'],
    state: row.state as Ticket['state'],
    assigneeId: (row.assigneeId ?? null) as string | null,
    openedAt: row.openedAt as string,
    updatedAt: row.updatedAt as string,
    closedAt: (row.closedAt ?? null) as string | null,
    incidentId: (row.incidentId ?? null) as string | null,
    summary: row.summary as string,
    assignee: (row.assignee ?? null) as string | null,
  };
}

/** The request's own page: the record whole, without the `statusClass` and `search` the collection derives for filtering. */
export function projectRequest(row: Record<string, unknown>): RequestRow {
  return {
    id: row.id as string,
    at: row.at as string,
    method: row.method as string,
    route: row.route as string,
    status: row.status as number,
    latency: row.latency as number,
    customer: row.customer as string,
    region: row.region as string,
    bytes: row.bytes as number,
    model: (row.model ?? null) as string | null,
    ttft: (row.ttft ?? null) as number | null,
    replayOf: (row.replayOf ?? null) as string | null,
  };
}

/**
 * A verification run, with the release it names as the read joined it: the four fields a run row shows, or null when no
 * release has that id. Nothing else of the release is carried, so the run's row stays as small as the table draws it.
 */
export function projectRun(row: Record<string, unknown>): RunRow {
  const release = row.release as Record<string, unknown> | null | undefined;
  return {
    id: row.id as string,
    suite: row.suite as string,
    endpointId: row.endpointId as string,
    releaseId: row.releaseId as string,
    state: row.state as VerificationRun['state'],
    durationMs: row.durationMs as number,
    startedAt: row.startedAt as string,
    failure: (row.failure ?? null) as string | null,
    release: release
      ? {
          version: release.version as string,
          service: release.service as string,
          environment: release.environment as Release['environment'],
          commit: release.commit as string,
        }
      : null,
  };
}

/**
 * A release, with what its required verifications came to. That answer is worked out on the server from the runs and
 * attached to the row before this is called; a row handed without it projects as requiring nothing, which is what a
 * release the runs cannot be read for would have to say.
 */
export function projectRelease(row: Record<string, unknown>): ReleaseRow {
  const verification = row.verification as Verification | undefined;
  return {
    id: row.id as string,
    version: row.version as string,
    service: row.service as string,
    environment: row.environment as Release['environment'],
    commit: row.commit as string,
    state: row.state as Release['state'],
    updatedAt: row.updatedAt as string,
    releasedAt: (row.releasedAt ?? null) as string | null,
    notes: row.notes as string,
    requiredVerifications: (row.requiredVerifications as Release['requiredVerifications']).map((v) => ({ suite: v.suite, endpointId: v.endpointId })),
    verification: {
      required: verification?.required ?? 0,
      passed: verification?.passed ?? 0,
      unresolved: (verification?.unresolved ?? []).map((u) => ({ suite: u.suite, endpointId: u.endpointId, state: u.state })),
    },
  };
}
