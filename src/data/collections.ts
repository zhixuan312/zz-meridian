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
import { app, facts, workspaceSlug } from '@/app.config';
import { arrayCollection, type AnyCollection, type Collection } from '@/lib/collection';
import { API_KEYS, type ApiKey } from '@/system/fixtures/sample-records';
import { MEMBERS, STATUSES, TEAMS, type Member } from '@/system/fixtures/sample-members';
import { ADD_ONS, MAIN_ROLES } from '@/data/roles';
import { ACTIVITY, DEMO_NOW, INCIDENTS, MODELS, PLANS, REQUESTS, SERVICES, type ComputeRow, type CostRow, type CustomerRecord, type DailyPoint, type Endpoint, type IncidentRecord, type Model, type RequestRow, type UsageRow } from '@/system/fixtures/sample';
import { COMPUTE, COSTS, CUSTOMERS, DAYS, ENDPOINTS, IN_PROGRESS, REGIONS, STATUS_MIX, USAGE, WEEKDAY_HOURS } from '@/system/fixtures/company';
import { PAST_INCIDENTS } from '@/system/fixtures/sample-ops';
import { RELEASES, RUNS, TICKETS, type Release, type Ticket, type VerificationRun } from '@/system/fixtures/sample-engineering';
import type { ActivityEvent } from '@/components/patterns/activity-feed';
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
  description: 'A sample of the API requests the workspace received, newest first, not every request: each with its status, latency in ms, customer, region, response size in bytes, the model that served it (an id of the models collection, or null when it reached none) and ttft, the ms from arrival to the first token, null where no model wrote one because the request reached none, reached the embedding model, or was refused. Being a sample, it is not where requests are counted: the days and usage collections hold every one.',
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
    ttft: z.number().nullable().default(null),
    replayOf: z.string().nullable().default(null),
  }),
  derived: ['statusClass', 'search'],
  derive: (r) => ({ statusClass: statusClass(Number(r.status)), search: `${r.id} ${r.route} ${r.customer}`.toLowerCase() }),
  rows: REQUESTS.map((r) => ({ ...r, statusClass: statusClass(r.status), search: `${r.id} ${r.route} ${r.customer}`.toLowerCase() })),
  // A replay is the one write: a person sending a failed request again from its page, never the assistant.
  allow: ['create'],
  pageOnly: ['create'],
});

/**
 * Whether a day is inside the band, by the rule `steady` counts: its p95 under `facts.band`'s latency and its errors over
 * its requests under its error rate. A day at either edge is outside, and so is a day with no requests, whose rate is
 * not a number.
 */
const inBand = (d: Record<string, unknown>) => Number(d.p95) < facts.band.p95Under && Number(d.errors) / Number(d.requests) < facts.band.errorRateUnder;

/** A day as the collection holds it: the record plus `inBand`, worked out from the configuration and never written. */
type DayRecord = DailyPoint & { inBand: boolean };

/**
 * One row per day: what the Home's and Usage' figures, trends and baselines are computed from. The last row may be the
 * day in progress, the row of the clock's own date; `readDays` keeps it out of every period. Read-only.
 */
export const days: Collection<DayRecord, 'date'> = arrayCollection({
  name: 'days',
  label: 'Daily totals',
  description: 'One row per day (UTC): requests answered, errors (5xx and 429), latency p95 in ms, tokens served (input and output, every model), revenue in US dollars (what customers paid for that day\'s tokens and calls), and revenueByPlan, that revenue by the plan of the customer that paid it (Enterprise, Scale, Starter); inBand is true when the day\'s p95 and its errors over its requests are both under the band the product holds itself to. The last row may be a day still in progress, holding only what has arrived so far, so it is not yet a complete day.',
  key: 'date',
  title: (d) => d.date,
  fields: z.object({ requests: z.number(), errors: z.number(), p95: z.number(), tokens: z.number(), revenue: z.number(), revenueByPlan: z.object({ Enterprise: z.number(), Scale: z.number(), Starter: z.number() }) }),
  derived: ['inBand'],
  derive: (d) => ({ inBand: inBand(d) }),
  rows: [...DAYS, IN_PROGRESS.day].map((d) => ({ ...d, inBand: inBand(d) })),
  allow: [],
});

/** What the product sells and at what price: the one place money comes from. Read-only. */
export const models: Collection<Model, 'id'> = arrayCollection({
  name: 'models',
  label: 'Models and prices',
  description: 'What the product sells, four rows: three models, and "none" for the calls that reach no model. Each says the route it serves, its inputPrice and outputPrice in US dollars per million tokens (null where it has none), and its callPrice in US dollars per call (null for a model, which is priced by the token).',
  key: 'id',
  title: (m) => m.label,
  fields: z.object({ label: z.string(), serves: z.string(), inputPrice: z.number().nullable(), outputPrice: z.number().nullable(), callPrice: z.number().nullable() }),
  rows: MODELS,
  allow: [],
});

/** What each model answered on each day, priced at its price: a day of `days` is the sum of its four rows here. Read-only. */
export const usage: Collection<UsageRow, 'id'> = arrayCollection({
  name: 'usage',
  label: 'Usage by model',
  description: 'One row per day (UTC) and model; the id is "<date>:<model>", and the model is an id of the models collection. Requests answered, inputTokens and outputTokens, revenue in US dollars (the tokens at the model\'s price, or the calls at the call price for "none"), errors (5xx and 429), latency p95 in ms, ttft (p95 time to the first token, in ms) and tps (output tokens a second at the median). ttft and tps are null for a model that writes no tokens. The rows of the last day may be of a day still in progress, holding only what has arrived so far, so they are not yet of a complete day.',
  key: 'id',
  title: (u) => u.id,
  fields: z.object({ date, model: z.string(), requests: z.number(), inputTokens: z.number(), outputTokens: z.number(), revenue: z.number(), errors: z.number(), p95: z.number(), ttft: z.number().nullable(), tps: z.number().nullable() }),
  rows: [...USAGE, ...IN_PROGRESS.usage],
  allow: [],
});

/** The GPUs each region ran on each day, and how much of them was used. Read-only. */
export const compute: Collection<ComputeRow, 'id'> = arrayCollection({
  name: 'compute',
  label: 'Compute by region',
  description: 'One row per day (UTC) and region; the id is "<date>:<region>". gpus is the GPUs provisioned that day, and used the GPU-hours used of the gpus x 24 GPU-hours they offered. The rows of the last day may be of a day still in progress, where used is of the hours it has had so far, so they are not yet of a complete day.',
  key: 'id',
  title: (c) => c.id,
  fields: z.object({ date, region: z.string(), gpus: z.number(), used: z.number() }),
  rows: [...COMPUTE, ...IN_PROGRESS.compute],
  allow: [],
});

/** What each day's compute cost. Read by an Owner and an Admin only (`costs:read`). Read-only. */
export const costs: Collection<CostRow, 'date'> = arrayCollection({
  name: 'costs',
  label: 'Compute cost',
  description: 'One row per day (UTC): compute, what the GPUs provisioned that day cost in US dollars. The last row may be a day still in progress, holding the cost of the hours it has had so far, so it is not yet a complete day.',
  key: 'date',
  title: (c) => c.date,
  fields: z.object({ compute: z.number() }),
  rows: [...COSTS, IN_PROGRESS.cost],
  allow: [],
});

/** Each endpoint over the last 30 complete days: requests, error rate and latency p95. Read-only. */
export const endpoints: Collection<Endpoint & { id: string }, 'id'> = arrayCollection({
  name: 'endpoints',
  label: 'Endpoints',
  description: 'Each API endpoint over the last 30 complete days: requests, error rate (5xx and 429, a fraction) and latency p95 in ms. The id is the method and route.',
  key: 'id',
  title: (e) => e.id,
  fields: z.object({ method: z.string(), route: z.string(), requests: z.number(), errorRate: z.number(), p95: z.number() }),
  rows: ENDPOINTS.map((e) => ({ ...e, id: `${e.method} ${e.route}` })),
  allow: [],
});

/** Responses by status class over the last 30 complete days. Read-only. */
export const responses: Collection<{ label: string; value: number }, 'label'> = arrayCollection({
  name: 'responses',
  label: 'Responses by class',
  description: 'How many responses each status class (2xx, 3xx, 4xx, 5xx) had over the last 30 complete days.',
  key: 'label',
  title: (r) => r.label,
  fields: z.object({ value: z.number() }),
  rows: STATUS_MIX,
  allow: [],
});

/** Requests for each weekday and hour, in the reporting timezone (`app.timezone`; the sample's is UTC): the cells of Usage's heatmap, and the hours of the day are their sums. Read-only. */
export const hours: Collection<(typeof WEEKDAY_HOURS)[number], 'id'> = arrayCollection({
  name: 'hours',
  label: 'Requests by weekday and hour',
  description: 'One row per weekday and hour (UTC): the requests over the last 30 complete days. The weekday is 0 (Monday) to 6 (Sunday) and the hour 0 to 23; the id is both, as "weekday-hour".',
  key: 'id',
  title: (h) => h.id,
  fields: z.object({ weekday: z.number().int().min(0).max(6), hour: z.number().int().min(0).max(23), requests: z.number() }),
  rows: WEEKDAY_HOURS,
  allow: [],
});

/** Requests and median latency for each region, in the order Usage draws them. Read-only. */
export const regions: Collection<(typeof REGIONS)[number], 'label'> = arrayCollection({
  name: 'regions',
  label: 'Requests by region',
  description: 'Each region over the last 30 complete days: requests and median latency (p50) in ms.',
  key: 'label',
  title: (r) => r.label,
  fields: z.object({ value: z.number(), p50: z.number() }),
  rows: REGIONS,
  allow: [],
});

/** The monitored services: state now, uptime, latency and 90 days of history, the last of them the day in progress. Read-only. */
export const services: Collection<Service & { order: number; uptimePercent: number }, 'name'> = arrayCollection({
  name: 'services',
  label: 'Services',
  description: 'Each monitored service: its state now, latency now in ms, its state on each of the last 90 days (oldest first; the last is the day in progress and is its state now), and uptime over those days, a fraction: 1 less what its marked days cost, half an hour for a degraded day and two hours for a day of outage, so it is 1 exactly when every day is operational; uptimePercent is the same uptime as a percentage.',
  key: 'name',
  title: (s) => s.name,
  fields: z.object({ description: z.string(), status: z.enum(['operational', 'degraded', 'outage']), uptime: z.number(), latency: z.number(), days: z.array(z.enum(['operational', 'degraded', 'outage'])), order: z.number() }),
  // `uptimePercent` is the uptime as the pages write it, a percentage: an answer writes two decimals, so a fraction
  // such as 0.9994 would read 1.
  derived: ['uptimePercent'],
  derive: (s) => ({ uptimePercent: Number(s.uptime) * 100 }),
  // `order` is where a service sits in every list: the gateway first, the way the team reads its stack.
  rows: SERVICES.map((s, order) => ({ ...s, order, uptimePercent: s.uptime * 100 })),
  allow: [],
});

/** Incidents, live and resolved, with their updates, who has each and the ticket its work is tracked in. Read-only. */
export const incidents: Collection<IncidentRecord, 'id'> = arrayCollection({
  name: 'incidents',
  label: 'Incidents',
  description: 'Incidents, live and resolved: the service, the severity, the state, when it started and was resolved, its updates, its owner (a member\'s name, or null) and ticketId (the id of the ticket its work is tracked in, which names the incident back as its incidentId, or null).',
  key: 'id',
  title: (i) => i.title,
  fields: z.object({ title: z.string(), service: z.string(), severity: z.enum(['minor', 'major']), state: z.enum(['investigating', 'monitoring', 'resolved']), started: z.string(), resolved: z.string().optional(), updates: z.array(z.object({ at: z.string(), text: z.string() })), owner: z.string().nullable(), ticketId: z.string().nullable() }),
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
 * The customers, from the sample's records: plan and status, what each asked of the API and paid in the last 30 complete
 * days, the 14-day trend, the dates of its life with us and who looks after it. Read-only — nobody in the console changes
 * a customer — so a page and a tool read them the same authorized way as every other collection (`read()`), and the
 * `customers:read` grant is asked on that one path. A customer that has left keeps its record and is counted in nothing.
 */
export const customers: Collection<CustomerRecord, 'id'> = arrayCollection({
  name: 'customers',
  label: 'Customers',
  description: 'The workspaces calling the API: their plan, their status (active, trial, past due or left), and over the last 30 complete days their requests, tokens, revenue in US dollars and requests by route (byEndpoint, summing to requests); the 14-day trend of requests a day, error rate (5xx and 429, a fraction), seats and region; the dates (YYYY-MM-DD) it joined, changed plan (planSince, with previousPlan), left, its trial ends (trialEnds) and since when it is past due (pastDueSince), each null when it does not apply; and its owner, a member\'s name. A customer that has left is counted in no figure of customers, revenue or requests.',
  key: 'id',
  title: (c) => c.name,
  fields: z.object({
    name: z.string(),
    plan: z.enum(PLANS),
    status: z.enum(['active', 'trial', 'past due', 'left']),
    requests: z.number(),
    tokens: z.number(),
    revenue: z.number(),
    byEndpoint: z.record(z.string(), z.number()),
    trend: z.array(z.number()),
    errorRate: z.number(),
    seats: z.number(),
    region: z.string(),
    owner: z.string(),
    joined: date,
    planSince: date.nullable(),
    previousPlan: z.enum(PLANS).nullable(),
    left: date.nullable(),
    trialEnds: date.nullable(),
    pastDueSince: date.nullable(),
  }),
  rows: CUSTOMERS,
  allow: [],
});

const stamp = z.iso.datetime();

/**
 * The work the team tracks against a service. A ticket is created and changed only through `ticketsFor` (the ticket
 * boundary), which sets its state, its id and its three times and applies the step rules; the collection's own fields
 * are the shape it stores. `openedAt`, `updatedAt`, `closedAt` and `incidentId` are `pageOnlyFields`: an agent reads
 * them and no agent tool asks for one. Nobody removes a ticket.
 */
export const tickets: Collection<Ticket, 'id'> = arrayCollection({
  name: 'tickets',
  label: 'Tickets',
  description: 'The work the team tracks against a service: its title, priority, state (open, waiting or closed), who it is assigned to, when it was opened and last changed, closedAt (when it was closed, null while it is open or waiting) and incidentId (the id of the incident it tracks the work of, or null).',
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
    closedAt: stamp.nullable().default(null),
    incidentId: z.string().nullable().default(null),
    summary: z.string().max(4000).default(''),
  }),
  rows: TICKETS,
  allow: ['create', 'update'],
  pageOnlyFields: ['openedAt', 'updatedAt', 'closedAt', 'incidentId'],
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

export const collections: AnyCollection[] = [members, keys, requests, days, models, usage, compute, costs, endpoints, responses, hours, regions, services, incidents, activity, customers, tickets, tests, releases, workspace];
