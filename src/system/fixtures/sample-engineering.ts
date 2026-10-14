/**
 * The sample's engineering records: the tickets the team works through, the verification runs that check each release,
 * and the releases themselves. Every time is derived backwards from the sample's now, so nothing is later than the clock.
 *
 * A release's recorded state follows its required verifications: it is `testing` exactly while some required pair
 * (a suite on an endpoint) has no run, or its latest run failed or was skipped. Two releases show the cases a reader
 * should not have to guess: one still testing because a pair has never run, and one that went out after a failure that a
 * later run cleared.
 */
import { DEMO_NOW } from '@/system/fixtures/sample';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(DEMO_NOW.getTime() - ms).toISOString();

export type TicketPriority = 'low' | 'normal' | 'high';
export type TicketState = 'open' | 'waiting' | 'closed';

export type Ticket = {
  id: string;
  title: string;
  service: string;
  priority: TicketPriority;
  state: TicketState;
  assigneeId: string | null;
  openedAt: string;
  updatedAt: string;
  /** When the ticket was closed: null while it is open or waiting. Set by the ticket boundary and by nobody else. */
  closedAt: string | null;
  /** The incident the ticket tracks the work of, by its id, or null. That incident names the ticket back. */
  incidentId: string | null;
  summary: string;
};

export type VerificationRun = {
  id: string;
  suite: string;
  endpointId: string;
  releaseId: string;
  state: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  startedAt: string;
  failure: string | null;
};

export type RequiredVerification = { suite: string; endpointId: string };

export type Release = {
  id: string;
  version: string;
  service: string;
  environment: 'staging' | 'production';
  commit: string;
  state: 'testing' | 'pending' | 'released';
  updatedAt: string;
  releasedAt: string | null;
  notes: string;
  requiredVerifications: RequiredVerification[];
};

/** The team's tickets. A closed one says when it was closed, the last time it changed; the first is the work behind the open incident, which names it back (./sample), opened once the incident had begun. */
export const TICKETS: Ticket[] = [
  { id: 'tickets_1', title: 'Inference API p95 above target in eu-west-1', service: 'Inference API', priority: 'high', state: 'open', assigneeId: 'members_2', openedAt: ago(3 * HOUR), updatedAt: ago(2 * HOUR), closedAt: null, incidentId: 'inc_2610', summary: 'p95 has sat above 900 ms for requests routed through eu-west-1 since the last capacity change. Traffic is shifted; the cause is not found yet.' },
  { id: 'tickets_2', title: 'Large uploads time out behind the proxy', service: 'Files', priority: 'normal', state: 'open', assigneeId: null, openedAt: ago(3 * DAY), updatedAt: ago(2 * DAY), closedAt: null, incidentId: null, summary: 'Multipart uploads over 40 MB fail on slow connections. Nobody owns it yet.' },
  { id: 'tickets_3', title: 'Retry schedule for failed webhook deliveries', service: 'Webhooks', priority: 'normal', state: 'waiting', assigneeId: 'members_4', openedAt: ago(9 * DAY), updatedAt: ago(1.5 * DAY), closedAt: null, incidentId: null, summary: 'Waiting on the customer to confirm which delivery window they can accept before the schedule changes.' },
  { id: 'tickets_4', title: 'Dashboard shows a stale usage figure after midnight UTC', service: 'Dashboard', priority: 'low', state: 'waiting', assigneeId: 'members_5', openedAt: ago(14 * DAY), updatedAt: ago(4 * DAY), closedAt: null, incidentId: null, summary: 'The daily total refreshes late for workspaces on a time zone ahead of UTC. Waiting for a reproduction from support.' },
  { id: 'tickets_5', title: 'Document the embeddings batch limit', service: 'Embeddings', priority: 'low', state: 'closed', assigneeId: 'members_1', openedAt: ago(21 * DAY), updatedAt: ago(16 * DAY), closedAt: ago(16 * DAY), incidentId: null, summary: 'The reference now states the 2,048-input limit and the error a larger batch returns.' },
  { id: 'tickets_6', title: 'Renew the gateway TLS certificate', service: 'Edge gateway', priority: 'high', state: 'closed', assigneeId: 'members_2', openedAt: ago(19 * DAY), updatedAt: ago(12 * DAY), closedAt: ago(12 * DAY), incidentId: null, summary: 'Renewed in every region ahead of the expiry date; the monitor now warns 30 days out.' },
  { id: 'tickets_7', title: 'Rate-limit headers missing on 429 responses', service: 'Edge gateway', priority: 'low', state: 'open', assigneeId: 'members_12', openedAt: ago(8 * DAY), updatedAt: ago(8 * DAY - 2 * HOUR), closedAt: null, incidentId: null, summary: 'A rate-limited response omits the retry-after header, so clients back off blindly.' },
  { id: 'tickets_8', title: 'Parser rejects PDFs with an embedded font table', service: 'Files', priority: 'high', state: 'open', assigneeId: 'members_1', openedAt: ago(2 * DAY), updatedAt: ago(7 * HOUR), closedAt: null, incidentId: null, summary: 'Three customers report uploads failing with a 422. The fix is in the next Files release.' },
  { id: 'tickets_9', title: 'Capacity plan for the next quarter of inference traffic', service: 'Inference API', priority: 'high', state: 'waiting', assigneeId: null, openedAt: ago(11 * DAY), updatedAt: ago(3 * DAY), closedAt: null, incidentId: null, summary: 'Waiting for the sales forecast before sizing the reserved capacity.' },
  { id: 'tickets_10', title: 'Webhook signing secret rotation guide', service: 'Webhooks', priority: 'normal', state: 'closed', assigneeId: 'members_4', openedAt: ago(30 * DAY), updatedAt: ago(24 * DAY), closedAt: ago(24 * DAY), incidentId: null, summary: 'Published with an example for both signing versions.' },
];

const MESSAGES = 'POST /v1/messages';
const SEARCH = 'GET /v1/search';
const EMBEDDINGS = 'POST /v1/embeddings';
const DOCUMENT = 'GET /v1/documents/:id';
const FILES = 'POST /v1/files';
const WEBHOOKS = 'PUT /v1/webhooks/:id';

const run = (id: number, releaseId: string, suite: string, endpointId: string, state: VerificationRun['state'], durationMs: number, startedAgo: number, failure: string | null = null): VerificationRun =>
  ({ id: `tests_${id}`, suite, endpointId, releaseId, state, durationMs, startedAt: ago(startedAgo), failure });

export const RUNS: VerificationRun[] = [
  // releases_1: the first smoke run failed; the rerun after the fix passed, and the release went out.
  run(1, 'releases_1', 'smoke', SEARCH, 'failed', 41_200, 3 * DAY, 'Expected 200 from the search endpoint, got 502 from the eu-central-1 pool.'),
  run(2, 'releases_1', 'smoke', SEARCH, 'passed', 38_900, 2.6 * DAY),
  run(3, 'releases_1', 'contract', MESSAGES, 'passed', 122_400, 2.7 * DAY),
  // releases_2: everything passed and the release waits for its window.
  run(4, 'releases_2', 'smoke', MESSAGES, 'passed', 52_100, 20 * HOUR),
  run(5, 'releases_2', 'load', MESSAGES, 'passed', 610_000, 19 * HOUR),
  // releases_3: the contract suite has never run on the upload endpoint.
  run(6, 'releases_3', 'smoke', FILES, 'passed', 47_300, 9 * HOUR),
  // releases_4: the latest smoke run failed, so the release stays in testing.
  run(7, 'releases_4', 'contract', EMBEDDINGS, 'passed', 98_700, 14 * HOUR),
  run(8, 'releases_4', 'smoke', EMBEDDINGS, 'passed', 44_000, 13 * HOUR),
  run(9, 'releases_4', 'smoke', EMBEDDINGS, 'failed', 61_800, 4 * HOUR, 'Batch of 2,048 inputs returned 500 after 30 s; the worker ran out of memory.'),
  // releases_5: shipped on a clean pass.
  run(10, 'releases_5', 'smoke', WEBHOOKS, 'passed', 36_500, 6 * DAY),
  run(11, 'releases_5', 'contract', WEBHOOKS, 'passed', 88_200, 6 * DAY + 2 * HOUR),
  // releases_6: the only required run was skipped.
  run(12, 'releases_6', 'smoke', DOCUMENT, 'skipped', 0, 5 * HOUR),
  // releases_7: an earlier production release, passed from the first run.
  run(13, 'releases_7', 'smoke', MESSAGES, 'passed', 50_400, 12 * DAY),
  run(14, 'releases_7', 'contract', MESSAGES, 'passed', 119_300, 12.1 * DAY),
  run(15, 'releases_7', 'load', MESSAGES, 'passed', 598_000, 11.9 * DAY),
];

export const RELEASES: Release[] = [
  {
    id: 'releases_1', version: 'v4.18.2', service: 'Edge gateway', environment: 'production', commit: '9f3c1a7', state: 'released',
    updatedAt: ago(2.2 * DAY), releasedAt: ago(2.2 * DAY), notes: 'Routes search traffic through the eu-central-1 pool. The first smoke run failed on a pool that was still warming; the rerun passed.',
    requiredVerifications: [{ suite: 'smoke', endpointId: SEARCH }, { suite: 'contract', endpointId: MESSAGES }],
  },
  {
    id: 'releases_2', version: 'v2.9.0', service: 'Inference API', environment: 'staging', commit: '41be0d2', state: 'pending',
    updatedAt: ago(18 * HOUR), releasedAt: null, notes: 'Adds streaming tool results. Every required check passed; it waits for the Thursday window.',
    requiredVerifications: [{ suite: 'smoke', endpointId: MESSAGES }, { suite: 'load', endpointId: MESSAGES }],
  },
  {
    id: 'releases_3', version: 'v1.14.0', service: 'Files', environment: 'staging', commit: 'c80a5e9', state: 'testing',
    updatedAt: ago(8 * HOUR), releasedAt: null, notes: 'Fixes the parser error on embedded font tables. The contract suite has not run on the upload endpoint yet.',
    requiredVerifications: [{ suite: 'smoke', endpointId: FILES }, { suite: 'contract', endpointId: FILES }],
  },
  {
    id: 'releases_4', version: 'v0.8.3', service: 'Embeddings', environment: 'staging', commit: '2d7f6b4', state: 'testing',
    updatedAt: ago(3.5 * HOUR), releasedAt: null, notes: 'Raises the batch limit. The latest smoke run failed on a full batch.',
    requiredVerifications: [{ suite: 'smoke', endpointId: EMBEDDINGS }, { suite: 'contract', endpointId: EMBEDDINGS }],
  },
  {
    id: 'releases_5', version: 'v3.2.0', service: 'Webhooks', environment: 'production', commit: 'a19e3c0', state: 'released',
    updatedAt: ago(5.8 * DAY), releasedAt: ago(5.8 * DAY), notes: 'Signs deliveries with the second signing version alongside the first.',
    requiredVerifications: [{ suite: 'smoke', endpointId: WEBHOOKS }, { suite: 'contract', endpointId: WEBHOOKS }],
  },
  {
    id: 'releases_6', version: 'v6.1.0', service: 'Dashboard', environment: 'staging', commit: '7b52d18', state: 'testing',
    updatedAt: ago(4.5 * HOUR), releasedAt: null, notes: 'Reworks the usage tiles. The smoke run was skipped when the staging data refresh overlapped it.',
    requiredVerifications: [{ suite: 'smoke', endpointId: DOCUMENT }],
  },
  {
    id: 'releases_7', version: 'v2.8.4', service: 'Inference API', environment: 'production', commit: 'e4c91fa', state: 'released',
    updatedAt: ago(11.5 * DAY), releasedAt: ago(11.5 * DAY), notes: 'Fixes a leak in long-lived streaming connections.',
    requiredVerifications: [{ suite: 'smoke', endpointId: MESSAGES }, { suite: 'contract', endpointId: MESSAGES }, { suite: 'load', endpointId: MESSAGES }],
  },
];
