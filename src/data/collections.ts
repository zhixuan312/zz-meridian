/**
 * The product's collections: the one place the console and the assistant are pointed at its data. The sample serves
 * its fixtures; a product replaces `rows` with its API and `clock` with `new Date()`.
 *
 * TWO THINGS TO DO THE DAY `rows` BECOMES A REAL DATABASE (issue #7, from a product running Postgres across a network):
 *
 * 1. Read each table ONCE per request. A console page asks for the same records from several places — the layout's
 *    shell tools, a page-level strip, the page itself and its freshness stamp — so the same query runs up to five times
 *    over. With the fixtures that is free; across a network it is a round trip each. Wrap the read in `cache()` from
 *    `react` (request-scoped, which is what the Next.js docs recommend around an ORM) and leave the write path reading
 *    directly, so a validation never sees an earlier answer. That product's three heaviest pages answered 44-46% sooner.
 * 2. Raise the connection pool's idle timeout. `pg` drops an idle connection after 10 seconds, and against a remote
 *    Postgres with TLS a new one cost that product 330 ms to 1.5 s — paid again on the next click by anybody who reads
 *    a page for a moment. `idleTimeoutMillis: 300_000` is what they settled on. A pool that keeps connections idle must
 *    also listen for their loss, `pool.on('error', (e) => console.error('db: an idle connection closed', e))`, or the
 *    database closing one is an uncaught error and the server exits (issue #16); add `connectionTimeoutMillis` too.
 */
import { z } from 'zod';
import { app, workspaceSlug } from '@/app.config';
import { arrayCollection, type AnyCollection, type Collection } from '@/lib/collection';
import { API_KEYS, CUSTOMERS, type ApiKey, type CustomerRecord } from '@/system/fixtures/sample-records';
import { MEMBERS, STATUSES, TEAMS, type Member } from '@/system/fixtures/sample-members';
import { ADD_ONS, MAIN_ROLES } from '@/data/roles';
import { ACTIVITY, DEMO_NOW, ENDPOINTS, INCIDENTS, REQUESTS, SERVICES, STATUS_MIX, demoSeries, type DailyPoint, type Endpoint, type RequestRow } from '@/system/fixtures/sample';
import { PAST_INCIDENTS, REGION_TRAFFIC, WEEKDAY_HOURS } from '@/system/fixtures/sample-ops';
import { RELEASES, RUNS, TICKETS, type Release, type Ticket, type VerificationRun } from '@/system/fixtures/sample-engineering';
import type { ActivityEvent } from '@/components/patterns/activity-feed';
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import { statusClass } from '@/data/sample';

/** The data's "now": the sample's fixed clock. A product returns `new Date()`. */
export const clock = (): Date => DEMO_NOW;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const members: Collection<Member, 'id'> = arrayCollection({
  name: 'members',
  label: 'Members',
  description: 'The people in the workspace, with their role, team, status and when they last used it.',
  key: 'id',
  title: (m) => m.name,
  fields: z.object({
    name: z.string().trim().min(1),
    email: z.email(),
    role: z.enum(MAIN_ROLES).default('Member'),
    addOns: z.array(z.enum(ADD_ONS)).transform((xs) => [...new Set(xs)]).default([]),
    team: z.enum(TEAMS),
    status: z.enum(STATUSES),
    joined: date,
    lastActive: date.nullable(),
  }),
  rows: MEMBERS,
  allow: ['create', 'update', 'remove'],
  // The spec freezes this line: an agent reads a member's role and add-ons and never writes them. They change only
  // through the Members page's `assignRole`, which the member boundary checks — so they are out of every agent write
  // schema and refused at execution if sent anyway.
  pageOnlyFields: ['role', 'addOns'],
});

export const keys: Collection<ApiKey, 'id'> = arrayCollection({
  name: 'keys',
  label: 'API keys',
  description: 'The workspace\'s API keys: who owns each, what it can reach, and when it was last used.',
  key: 'id',
  title: (k) => k.name,
  fields: z.object({
    name: z.string(),
    hint: z.string(),
    secretHash: z.string(),
    owner: z.string(),
    created: z.string(),
    lastUsed: z.string().nullable(),
    scopes: z.array(z.string()),
    env: z.enum(['live', 'test']),
  }),
  rows: API_KEYS,
  allow: ['create', 'remove'],
  pageOnly: ['create'],
  hidden: ['secretHash'],
});

/** A request as the collection holds it: the record plus two values worked out for filtering, never written. `search` is the lower-cased id, route and customer; a page does not carry it (`publicRows`). */
type RequestRecord = RequestRow & { statusClass: ReturnType<typeof statusClass>; search: string };

export const requests: Collection<RequestRecord, 'id'> = arrayCollection({
  name: 'requests',
  label: 'Requests',
  description: 'The API requests the workspace received, newest first, with status, latency and customer.',
  key: 'id',
  title: (r) => r.id,
  fields: z.object({
    at: z.string(),
    method: z.string(),
    route: z.string(),
    status: z.number(),
    latency: z.number(),
    customer: z.string(),
    region: z.string(),
    bytes: z.number(),
    model: z.string().nullable(),
    replayOf: z.string().nullable().default(null),
  }),
  derived: ['statusClass', 'search'],
  derive: (r) => ({ statusClass: statusClass(Number(r.status)), search: `${r.id} ${r.route} ${r.customer}`.toLowerCase() }),
  rows: REQUESTS.map((r) => ({ ...r, statusClass: statusClass(r.status), search: `${r.id} ${r.route} ${r.customer}`.toLowerCase() })),
  // A replay is the one write: a person sending a failed request again from its page, never the assistant.
  allow: ['create'],
  pageOnly: ['create'],
});

/** One row per day: what the Overview's and Analytics' figures, trends and baselines are computed from. Read-only. */
export const days: Collection<DailyPoint, 'date'> = arrayCollection({
  name: 'days',
  label: 'Daily totals',
  description: 'One row per day (UTC): requests answered, errors (5xx and 429), latency p95 in ms and spend in US dollars.',
  key: 'date',
  title: (d) => d.date,
  fields: z.object({ requests: z.number(), errors: z.number(), p95: z.number(), spend: z.number() }),
  // Every day the sample holds: the current period and the one before it, for the longest period it offers.
  rows: [...demoSeries('all').previous, ...demoSeries('all').current],
  allow: [],
});

/** Each endpoint over the period: requests, error rate and latency p95. Read-only. */
export const endpoints: Collection<Endpoint & { id: string }, 'id'> = arrayCollection({
  name: 'endpoints',
  label: 'Endpoints',
  description: 'Each API endpoint over the period: requests, error rate (5xx and 429, a fraction) and latency p95 in ms. The id is the method and route.',
  key: 'id',
  title: (e) => e.id,
  fields: z.object({ method: z.string(), route: z.string(), requests: z.number(), errorRate: z.number(), p95: z.number() }),
  rows: ENDPOINTS.map((e) => ({ ...e, id: `${e.method} ${e.route}` })),
  allow: [],
});

/** Responses by status class over the period. Read-only. */
export const responses: Collection<{ label: string; value: number }, 'label'> = arrayCollection({
  name: 'responses',
  label: 'Responses by class',
  description: 'How many responses each status class (2xx, 3xx, 4xx, 5xx) had over the period.',
  key: 'label',
  title: (r) => r.label,
  fields: z.object({ value: z.number() }),
  rows: STATUS_MIX,
  allow: [],
});

/** Requests for each weekday and UTC hour: the cells of Analytics' heatmap, and the hours of the day are their sums. Read-only. */
export const hours: Collection<(typeof WEEKDAY_HOURS)[number], 'id'> = arrayCollection({
  name: 'hours',
  label: 'Requests by weekday and hour',
  description: 'One row per weekday and hour (UTC): the requests over the period. The weekday is 0 (Monday) to 6 (Sunday) and the hour 0 to 23; the id is both, as "weekday-hour".',
  key: 'id',
  title: (h) => h.id,
  fields: z.object({ weekday: z.number().int().min(0).max(6), hour: z.number().int().min(0).max(23), requests: z.number() }),
  rows: WEEKDAY_HOURS,
  allow: [],
});

/** Requests and median latency for each region, in the order Analytics draws them. Read-only. */
export const regions: Collection<(typeof REGION_TRAFFIC)[number], 'label'> = arrayCollection({
  name: 'regions',
  label: 'Requests by region',
  description: 'Each region over the period: requests and median latency (p50) in ms.',
  key: 'label',
  title: (r) => r.label,
  fields: z.object({ value: z.number(), p50: z.number() }),
  rows: REGION_TRAFFIC,
  allow: [],
});

/** The monitored services: state now, uptime, latency and 90 days of history. Read-only. */
export const services: Collection<Service & { order: number }, 'name'> = arrayCollection({
  name: 'services',
  label: 'Services',
  description: 'Each monitored service: its state now, uptime over 90 days (a fraction), latency now in ms, and its state on each of the last 90 days.',
  key: 'name',
  title: (s) => s.name,
  fields: z.object({ description: z.string(), status: z.enum(['operational', 'degraded', 'outage']), uptime: z.number(), latency: z.number(), days: z.array(z.enum(['operational', 'degraded', 'outage'])), order: z.number() }),
  // `order` is where a service sits in every list: the gateway first, the way the team reads its stack.
  rows: SERVICES.map((s, order) => ({ ...s, order })),
  allow: [],
});

/** Incidents, live and resolved, with their updates. Read-only. */
export const incidents: Collection<Incident, 'id'> = arrayCollection({
  name: 'incidents',
  label: 'Incidents',
  description: 'Incidents, live and resolved: the service, the severity, the state, when it started and was resolved, and its updates.',
  key: 'id',
  title: (i) => i.title,
  fields: z.object({ title: z.string(), service: z.string(), severity: z.enum(['minor', 'major']), state: z.enum(['investigating', 'monitoring', 'resolved']), started: z.string(), resolved: z.string().optional(), updates: z.array(z.object({ at: z.string(), text: z.string() })) }),
  rows: [...new Map([...INCIDENTS, ...PAST_INCIDENTS].map((i) => [i.id, i])).values()],
  allow: [],
});

/**
 * What happened in the workspace, newest first: people's changes, the system's, and an agent's, marked with `via`.
 * Only the server writes here: `pageOnly` keeps it off every agent's tools, and the assistant's approved changes are
 * recorded by the route's `record` (decision 0011), never by a tool an agent could call.
 */
export const activity: Collection<ActivityEvent, 'id'> = arrayCollection({
  name: 'activity',
  label: 'Activity',
  description: 'What happened in the workspace, with who did it and, for an agent\'s change, which agent and for whom.',
  key: 'id',
  title: (e) => `${e.actor} ${e.verb} ${e.object}`,
  fields: z.object({ at: z.string(), actor: z.string(), system: z.boolean().optional(), via: z.string().optional(), verb: z.string(), object: z.string(), tone: z.enum(['positive', 'warning', 'critical']).optional() }),
  rows: ACTIVITY,
  allow: ['create'],
  pageOnly: ['create'],
});

/**
 * The customers, from the sample's records: plan, requests, spend, the 14-day trend, status and where they are. Read-only
 * — nobody in the console changes a customer — so a page and a tool read them the same authorized way as every other
 * collection (`read()`), and the `customers:read` grant is asked on that one path.
 */
export const customers: Collection<CustomerRecord, 'id'> = arrayCollection({
  name: 'customers',
  label: 'Customers',
  description: 'The workspaces calling the API: their plan, status, requests, spend over 30 days, 14-day trend, error rate and seats.',
  key: 'id',
  title: (c) => c.name,
  fields: z.object({
    name: z.string(),
    plan: z.enum(['Enterprise', 'Scale', 'Starter']),
    requests: z.number(),
    spend: z.number(),
    trend: z.array(z.number()),
    status: z.enum(['active', 'trial', 'past due']),
    region: z.string(),
    since: z.string(),
    errorRate: z.number(),
    seats: z.number(),
  }),
  rows: CUSTOMERS,
  allow: [],
});

const stamp = z.iso.datetime();

/**
 * The work the team tracks against a service. A ticket is created and changed only through `ticketsFor` (the ticket
 * boundary), which sets its state, its id and both times and applies the step rules; the collection's own fields are the
 * shape it stores. `openedAt` and `updatedAt` are `pageOnlyFields`, so no agent tool asks for either. Nobody removes one.
 */
export const tickets: Collection<Ticket, 'id'> = arrayCollection({
  name: 'tickets',
  label: 'Tickets',
  description: 'The work the team tracks against a service: its title, priority, state (open, waiting or closed), who it is assigned to, and when it was opened and last changed.',
  key: 'id',
  title: (t) => t.title,
  fields: z.object({
    title: z.string().trim().min(1).max(160),
    service: z.string().describe('The name of a service, as the services collection spells it.'),
    priority: z.enum(['low', 'normal', 'high']),
    state: z.enum(['open', 'waiting', 'closed']).default('open').describe('A new ticket is always open; a change moves it along open, waiting and closed.'),
    assigneeId: z.string().nullable().default(null).describe('The id of a member, or null when nobody has it.'),
    openedAt: stamp,
    updatedAt: stamp,
    summary: z.string().max(4000).default(''),
  }),
  rows: TICKETS,
  allow: ['create', 'update'],
  pageOnlyFields: ['openedAt', 'updatedAt'],
});

/** Each run of a verification suite against one endpoint of one release, with its verdict. Read-only. */
export const tests: Collection<VerificationRun, 'id'> = arrayCollection({
  name: 'tests',
  label: 'Verification runs',
  description: 'Each run of a verification suite against one endpoint of a release: the verdict (passed, failed or skipped), how long it took, when it started and, for a failure, why.',
  key: 'id',
  title: (r) => `${r.suite} on ${r.endpointId}`,
  fields: z.object({
    suite: z.string(),
    endpointId: z.string(),
    releaseId: z.string(),
    state: z.enum(['passed', 'failed', 'skipped']),
    durationMs: z.number(),
    startedAt: stamp,
    failure: z.string().nullable(),
  }),
  rows: RUNS,
  allow: [],
});

/** What is being shipped to an environment, and the verifications it needs before it can go. Read-only. */
export const releases: Collection<Release, 'id'> = arrayCollection({
  name: 'releases',
  label: 'Releases',
  description: 'A version of a service on its way to an environment: testing while a required verification is missing, failed or skipped, pending when all have passed, released once it is out.',
  key: 'id',
  title: (r) => `${r.service} ${r.version}`,
  fields: z.object({
    version: z.string(),
    service: z.string(),
    environment: z.enum(['staging', 'production']),
    commit: z.string(),
    state: z.enum(['testing', 'pending', 'released']),
    updatedAt: stamp,
    releasedAt: stamp.nullable(),
    notes: z.string(),
    requiredVerifications: z.array(z.object({ suite: z.string(), endpointId: z.string() })),
  }),
  rows: RELEASES,
  allow: [],
});

/** What the workspace record is: its key is the one row's id, so a page changes it by that id. */
type WorkspaceRow = { id: string; name: string; slug: string };

/**
 * This workspace itself: the name an invitation to join it shows, and its address. One record, seeded from the identity
 * the Settings form has always shown, and the only collection a Settings save changes. Its one write is `pageOnly`, so no agent tool carries it, and it cannot be removed.
 */
export const workspace: Collection<WorkspaceRow, 'id'> = arrayCollection({
  name: 'workspace',
  label: 'Workspace',
  description: 'This workspace: the name an invitation to join it shows, and its address.',
  key: 'id',
  title: (w) => w.name,
  fields: z.object({ name: z.string().trim().min(1), slug: z.string() }),
  rows: [{ id: 'workspace', name: `${app.name} ${app.workspace}`, slug: workspaceSlug }],
  allow: ['update'],
  pageOnly: ['update'],
});

export const collections: AnyCollection[] = [members, keys, requests, days, endpoints, responses, hours, regions, services, incidents, activity, customers, tickets, tests, releases, workspace];
