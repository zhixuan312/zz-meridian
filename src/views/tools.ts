/**
 * Every view's tool, in one list (decision 0011): the console's assistant offers each as a read-only `view_<name>`
 * tool, an MCP server registers the same contracts under its own prefix (`docs/agents.md`), and the pages and embed
 * routes render from the same `read`. Server only: the reads go through `read()`, scoped to whoever is asking.
 *
 * A product points these at its data the way it points the collections: replace a `read`, keep its contract.
 */
import { z } from 'zod';
import { slug } from '@/app.config';
import { clock } from '@/data/collections';
import { read } from '@/data/read';
import { readRequests, REQUEST_PAGE } from '@/data/requests';
import { readActivity, readDays, readEndpoints, readIncidents, readResponses, readServices } from '@/data/metrics';
import {
  CUSTOMERS, DEMO_UPDATED_AT, REGION_LATENCY, STATUS_TEXT, demoHeatmap, payloadsOf, requestsByHour, traceOf,
  type ApiKey, type Member, type RequestRow,
} from '@/data/sample';
import { PERIODS } from '@/lib/period';
import { defineViewTool, type ViewTool } from '@/lib/shared-context';
import { analyticsContext } from './analytics-context';
import { customersContext } from './customers-context';
import { healthContext } from './health-context';
import { SCOPES } from './key-scopes';
import { keysContext } from './keys-context';
import { membersContext } from './members-context';
import { overviewContext, type OverviewData } from './overview-context';
import { requestContext } from './request-context';
import { requestsContext } from './requests-context';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('A day of the period, YYYY-MM-DD: the view opens pointed at it.');
const period = z.enum(PERIODS).optional().describe('The reporting period; 30d when not given.');
const updatedAt = () => DEMO_UPDATED_AT.toISOString();

export const overviewTool = defineViewTool({
  name: 'overview',
  title: 'Overview',
  description: 'How the API is doing over a period: requests, error rate, latency and spend with their change, the days that stand out, and what explains them.',
  input: z.object({ period, day }),
  resourceUri: `ui://${slug}/overview`,
  async read({ period: p = '30d', day: d }) {
    const [{ series, totals, observedAt }, endpoints, mix, activity, { all: incidents }] = await Promise.all([readDays(p), readEndpoints(), readResponses(), readActivity(), readIncidents()]);
    const data: OverviewData = { period: p, series, totals, endpoints, mix, activity, incidents, updatedAt: updatedAt(), now: observedAt, day: d ?? null };
    const index = d ? data.series.findIndex((x) => x.date === d) : -1;
    return { context: overviewContext(data, index >= 0 ? index : null), data };
  },
});

export const requestsTool = defineViewTool({
  name: 'requests',
  title: 'Requests',
  description: 'The request log, filtered: how many match, their errors and latency against the half hour before, the newest of them, and what they have in common.',
  input: z.object({
    status: z.enum(['all', '2xx', '3xx', '4xx', '5xx']).optional(),
    method: z.string().optional(),
    region: z.string().optional(),
    q: z.string().max(100).optional().describe('Text in the id, the route or the customer.'),
  }),
  resourceUri: `ui://${slug}/requests`,
  async read(input) {
    const { rows, total, summary, state, observedAt } = await readRequests(input);
    const data = { rows, total, summary, state, pageSize: REQUEST_PAGE, updatedAt: updatedAt(), now: observedAt };
    return { context: requestsContext(data, 5), data };
  },
});

export const requestTool = defineViewTool({
  name: 'request',
  title: 'Request',
  description: 'One request by its id: how it ended, where its time went, and how its latency compares with its route.',
  input: z.object({ id: z.string().min(1).max(40) }),
  async read({ id }) {
    const { rows, observedAt } = await read('requests', { where: [{ field: 'id', op: 'eq', value: id }], limit: 1 });
    const r = rows[0] as RequestRow | undefined;
    if (!r) throw new Error(`No request with the id ${id}.`);
    const payloads = payloadsOf(r);
    const endpoints = await readEndpoints();
    const context = requestContext({ request: r, trace: traceOf(r), routeP95: endpoints.find((e) => e.method === r.method && e.route === r.route)?.p95 ?? null, statusText: STATUS_TEXT[r.status] ?? '', payloadBytes: { request: payloads.request?.length ?? null, response: payloads.response.length }, now: observedAt });
    return { context, data: {} };
  },
});

export const healthTool = defineViewTool({
  name: 'health',
  title: 'Health',
  description: 'Every service now and over 90 days, the open incident with its latest update, and the incidents resolved in the period.',
  input: z.object({}),
  resourceUri: `ui://${slug}/health`,
  async read() {
    const [services, { current, past }] = await Promise.all([readServices(), readIncidents()]);
    const data = { services, current, past, updatedAt: updatedAt(), now: clock().toISOString() };
    return { context: healthContext(data), data };
  },
});

export const analyticsTool = defineViewTool({
  name: 'analytics',
  title: 'Analytics',
  description: 'When traffic comes and from where over a period: the busiest hours, regions with their latency, every endpoint, and the days that stand out.',
  input: z.object({ period }),
  async read({ period: p = '30d' }) {
    const [{ series, observedAt }, endpoints, activity, { all: incidents }] = await Promise.all([readDays(p), readEndpoints(), readActivity(), readIncidents()]);
    const data = { period: p, series, heat: demoHeatmap(), hours: requestsByHour(), regions: REGION_LATENCY, endpoints, activity, incidents, updatedAt: updatedAt(), now: observedAt };
    return { context: analyticsContext(data), data };
  },
});

export const customersTool = defineViewTool({
  name: 'customers',
  title: 'Customers',
  description: 'Every customer with plan, status, requests, spend and error rate; where spend concentrates, who is moving against the rest, and who fails most.',
  input: z.object({ q: z.string().max(100).optional(), plan: z.enum(['all', 'Enterprise', 'Scale', 'Starter']).optional(), status: z.enum(['all', 'active', 'trial', 'past due']).optional() }),
  async read({ q = '', plan = 'all', status = 'all' }) {
    const f = { q, plan, status, sort: 'spend', dir: 'desc', page: '1' };
    const matching = CUSTOMERS.filter((c) => (plan === 'all' || c.plan === plan) && (status === 'all' || c.status === status) && (!q || c.name.toLowerCase().includes(q.toLowerCase())));
    return { context: customersContext(CUSTOMERS, matching, f), data: {} };
  },
});

export const membersTool = defineViewTool({
  name: 'members',
  title: 'Members',
  description: 'Everyone in the workspace with role, team, status and when they were last seen; who has gone quiet and which invitations wait.',
  input: z.object({}),
  async read() {
    const { rows, observedAt } = await read('members', { sort: { field: 'joined', dir: 'desc' } });
    return { context: membersContext(rows as Member[], observedAt), data: {} };
  },
});

export const keysTool = defineViewTool({
  name: 'keys',
  title: 'API keys',
  description: 'Every API key with owner, scopes and last use; which live keys sit unused or carry every scope. Never a secret.',
  input: z.object({}),
  async read() {
    const { rows, observedAt } = await read('keys');
    return { context: keysContext(rows as ApiKey[], observedAt, SCOPES), data: {} };
  },
});

/** Every view's tool. The assistant route hands these to `assistantTools`, as it hands the collections. */
export const viewTools: ViewTool[] = [overviewTool, requestsTool, requestTool, healthTool, analyticsTool, customersTool, membersTool, keysTool] as ViewTool[];
