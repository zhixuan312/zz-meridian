/**
 * Every view's tool, in one list (decision 0011): the console's assistant offers each as a read-only `view_<name>`
 * tool, an MCP server registers the same contracts under its own prefix (`docs/agents.md`), and the pages and embed
 * routes render from the same `read`. Server only: the reads go through `read()`, scoped to whoever is asking.
 *
 * A product points these at its data the way it points the collections: replace a `read`, keep its contract.
 */
import { z } from 'zod';
import { slug } from '@/app.config';
import { requireNeed } from '@/data/access';
import { clock } from '@/data/collections';
import { FEATURES } from '@/data/features';
import { read, readAll } from '@/data/read';
import { readRequests, REQUEST_PAGE } from '@/data/requests';
import { readReleases, readRuns } from '@/data/engineering';
import { readMainSummary } from '@/data/main';
import { readTickets } from '@/data/tickets';
import { readActivity, readDays, readEndpoints, readIncidents, readResponses, readServices } from '@/data/metrics';
import {
  DEMO_UPDATED_AT, STATUS_TEXT, payloadsOf, traceOf,
  type ApiKey, type CustomerRecord, type Member, type RequestRow,
} from '@/data/sample';
import { PERIODS } from '@/lib/period';
import { defineViewTool, type ViewTool } from '@/lib/shared-context';
import { usageContext } from './usage-context';
import { usageFigures } from '@/data/usage';
import { customerFigures, customerRow, customersContext, under } from './customers-context';
import { customerContext, type CustomerData } from './customer-context';
import { servicesContext } from './services-context';
import { SCOPES } from './key-scopes';
import { keysContext } from './keys-context';
import { membersContext } from './members-context';
import { nowContext } from './now-context';
import { homeContext, type HomeData } from './home-context';
import { requestContext } from './request-context';
import { revenueContext } from './revenue-context';
import { requestsContext } from './requests-context';
import { releaseFigures, releasesContext } from './releases-context';
import { testFigures, testsContext } from './tests-context';
import { ticketCounts, ticketsContext } from './tickets-context';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('A day of the period, YYYY-MM-DD: the view opens pointed at it.');
const period = z.enum(PERIODS).optional().describe('The reporting period, in complete days counted back from yesterday: 7d, 30d or 90d, each compared with the same number of days before it, or all, every complete day kept, which has no period before it. 30d when not given.');
const updatedAt = () => DEMO_UPDATED_AT.toISOString();

export const homeTool = defineViewTool({
  name: 'home',
  title: 'Home',
  description: 'How the API is doing over a period: requests, error rate, latency and revenue with their change, the days that stand out, and what explains them; and Main\'s summary of the whole product: customers, services and incidents, tickets, failing verifications and releases.',
  needs: FEATURES.home.needs,
  input: z.object({ period, day }),
  resourceUri: `ui://${slug}/home`,
  async read({ period: p = '30d', day: d }) {
    await requireNeed(FEATURES.home.needs);
    const [{ series, totals, running, observedAt }, endpoints, mix, activity, { all: incidents }, summary] = await Promise.all([readDays(p), readEndpoints(), readResponses(), readActivity(), readIncidents(), readMainSummary()]);
    const data: HomeData = { period: p, series, totals, running, endpoints, mix, activity, incidents, summary, updatedAt: updatedAt(), now: observedAt, day: d ?? null };
    const index = d ? data.series.findIndex((x) => x.date === d) : -1;
    return { context: homeContext(data, index >= 0 ? index : null), data };
  },
});

export const requestsTool = defineViewTool({
  name: 'requests',
  title: 'Requests',
  description: 'The request log, filtered: how many match, their errors and latency against the half hour before, the newest of them, and what they have in common.',
  needs: FEATURES.requests.needs,
  input: z.object({
    status: z.enum(['all', '2xx', '3xx', '4xx', '5xx']).optional(),
    method: z.string().optional(),
    region: z.string().optional(),
    q: z.string().max(100).optional().describe('Text in the id, the route or the customer.'),
  }),
  resourceUri: `ui://${slug}/requests`,
  async read(input) {
    await requireNeed(FEATURES.requests.needs);
    const { rows, total, summary, state, observedAt } = await readRequests(input);
    const data = { rows, total, summary, state, pageSize: REQUEST_PAGE, updatedAt: updatedAt(), now: observedAt };
    return { context: requestsContext(data, 5), data };
  },
});

export const requestTool = defineViewTool({
  name: 'request',
  title: 'Request',
  description: 'One request by its id: how it ended, where its time went, and how its latency compares with its route.',
  needs: FEATURES.request.needs,
  input: z.object({ id: z.string().min(1).max(40) }),
  async read({ id }) {
    await requireNeed(FEATURES.request.needs);
    const { rows, observedAt } = await read('requests', { where: [{ field: 'id', op: 'eq', value: id }], limit: 1 });
    const r = rows[0] as RequestRow | undefined;
    if (!r) throw new Error(`No request with the id ${id}.`);
    const payloads = payloadsOf(r);
    const endpoints = await readEndpoints();
    const context = requestContext({ request: r, trace: traceOf(r), routeP95: endpoints.find((e) => e.method === r.method && e.route === r.route)?.p95 ?? null, statusText: STATUS_TEXT[r.status] ?? '', payloadBytes: { request: payloads.request?.length ?? null, response: payloads.response.length }, now: observedAt });
    return { context, data: {} };
  },
});

export const servicesTool = defineViewTool({
  name: 'services',
  title: 'Services',
  description: 'Every service now and over 90 days, every open incident with its latest update, and the incidents resolved in the last 90 days.',
  needs: FEATURES.services.needs,
  input: z.object({}),
  async read() {
    await requireNeed(FEATURES.services.needs);
    const [services, { current, open, past }] = await Promise.all([readServices(), readIncidents()]);
    const data = { services, current, alsoOpen: open.slice(1), past, updatedAt: updatedAt(), now: clock().toISOString() };
    return { context: servicesContext(data), data };
  },
});

export const nowTool = defineViewTool({
  name: 'now',
  title: 'Now',
  description: 'Which services are up this moment, with their latency, and the incidents nobody has resolved, the newest with its latest update.',
  needs: FEATURES.now.needs,
  input: z.object({}),
  resourceUri: `ui://${slug}/now`,
  async read() {
    await requireNeed(FEATURES.now.needs);
    const [services, { current, open }] = await Promise.all([readServices(), readIncidents()]);
    const data = { services, current, alsoOpen: open.slice(1), updatedAt: updatedAt(), now: clock().toISOString() };
    return { context: nowContext(data), data };
  },
});

export const usageTool = defineViewTool({
  name: 'usage',
  title: 'Usage',
  description: 'Requests, error rate, latency and revenue over a period against the period before, the days that stand out, and when traffic comes and from where: the busiest hours, regions with their latency, and every endpoint.',
  needs: FEATURES.usage.needs,
  input: z.object({ period }),
  async read({ period: p = '30d' }) {
    await requireNeed(FEATURES.usage.needs);
    const [{ series, totals, observedAt }, endpoints, activity, { all: incidents }, figures] = await Promise.all([readDays(p), readEndpoints(), readActivity(), readIncidents(), usageFigures()]);
    const data = { period: p, series, totals, ...figures, endpoints, activity, incidents, updatedAt: updatedAt(), now: observedAt };
    return { context: usageContext(data), data };
  },
});

export const customersTool = defineViewTool({
  name: 'customers',
  title: 'Customers',
  description: 'The customers that have not left, with plan, status, requests, revenue and error rate: how many there are, where revenue concentrates, who is moving against the rest, and who fails most. A customer that has left is counted in nothing and listed under the status left.',
  needs: FEATURES.customers.needs,
  input: z.object({ q: z.string().max(100).optional(), plan: z.enum(['all', 'Enterprise', 'Scale', 'Starter']).optional(), status: z.enum(['all', 'active', 'trial', 'past due', 'left']).optional().describe('`all` is every customer that has not left; `left` lists those that have.') }),
  async read({ q = '', plan = 'all', status = 'all' }) {
    await requireNeed(FEATURES.customers.needs);
    // The one way the tool sees customers: through the collection, so `customers:read` is asked on the same path as every
    // other tool's read, and a policy that does not bind the collection refuses here as it does everywhere else. Every
    // customer, as the page reads them: a read answers a hundred rows, and a count over the first hundred is not the count.
    const { rows } = await readAll('customers');
    const all = (rows as CustomerRecord[]).map(customerRow);
    const f = { q, plan, status, sort: 'revenue', dir: 'desc', page: '1' };
    const matching = under(all, status).filter((c) => (plan === 'all' || c.plan === plan) && (!q || c.name.toLowerCase().includes(q.toLowerCase())));
    return { context: customersContext(all, matching, f), data: {} };
  },
});

export const revenueTool = defineViewTool({
  name: 'revenue',
  title: 'Revenue',
  description: 'Revenue over the last 30 days, how many customers there are and who is past due.',
  needs: FEATURES.revenue.needs,
  input: z.object({}),
  async read() {
    await requireNeed(FEATURES.revenue.needs);
    const { rows } = await readAll('customers');
    const { customers, revenue, pastDue } = customerFigures(rows as CustomerRecord[]);
    const data = { customers, revenue, pastDue: pastDue.map((c) => ({ name: c.name, revenue: c.revenue })), updatedAt: updatedAt(), now: clock().toISOString() };
    return { context: revenueContext(data), data };
  },
});

/** One customer's page data, or null when no customer has the id: the page and the tool read it the same way. */
export async function readCustomer(id: string): Promise<CustomerData | null> {
  const { rows } = await read('customers', { where: [{ field: 'id', op: 'eq', value: id }], limit: 1 });
  const customer = rows[0] as CustomerRecord | undefined;
  return customer ? { customer, updatedAt: updatedAt(), now: clock().toISOString() } : null;
}

export const customerTool = defineViewTool({
  name: 'customer',
  title: 'Customer',
  description: 'One customer by its id: its plan and status, what it asked of the API and was billed in the last 30 days, its error rate, and how its last 14 days moved.',
  needs: FEATURES.customer.needs,
  input: z.object({ id: z.string().min(1).max(60) }),
  async read({ id }) {
    await requireNeed(FEATURES.customer.needs);
    const data = await readCustomer(id);
    if (!data) throw new Error(`No customer with the id ${id}.`);
    return { context: customerContext(data), data };
  },
});

export const membersTool = defineViewTool({
  name: 'members',
  title: 'Members',
  description: 'Everyone in the workspace with role, team, status and when they were last seen; who has gone quiet and which invitations wait.',
  needs: FEATURES.members.needs,
  input: z.object({}),
  async read() {
    await requireNeed(FEATURES.members.needs);
    const { rows, observedAt } = await read('members', { sort: { field: 'joined', dir: 'desc' } });
    return { context: membersContext(rows as Member[], observedAt), data: {} };
  },
});

export const keysTool = defineViewTool({
  name: 'keys',
  title: 'API keys',
  description: 'Every API key with owner, scopes and last use; which live keys sit unused or carry every scope. Never a secret.',
  needs: FEATURES.keys.needs,
  input: z.object({}),
  async read() {
    await requireNeed(FEATURES.keys.needs);
    const { rows, observedAt } = await read('keys');
    return { context: keysContext(rows as ApiKey[], observedAt, SCOPES), data: {} };
  },
});

export const ticketsTool = defineViewTool({
  name: 'tickets',
  title: 'Tickets',
  description: 'The tickets the team tracks against a service: how many are open, waiting and closed, which are unowned or have gone quiet, and the newest changes.',
  needs: FEATURES.tickets.needs,
  input: z.object({ q: z.string().max(100).optional(), state: z.enum(['all', 'open', 'waiting', 'closed']).optional(), priority: z.enum(['all', 'high', 'normal', 'low']).optional() }),
  async read({ q = '', state = 'all', priority = 'all' }) {
    // The one way the tool sees tickets: the read the page uses, so the figures it is told are the figures on the screen.
    const { rows, observedAt } = await readTickets();
    return { context: ticketsContext(rows, observedAt, { q, state, priority }), data: { counts: ticketCounts(rows) } };
  },
});

export const testsTool = defineViewTool({
  name: 'tests',
  title: 'Tests',
  description: 'The verification runs: how many verifications have a latest run, how many are failing or skipped, why the failing ones failed, and the newest runs.',
  needs: FEATURES.tests.needs,
  input: z.object({ q: z.string().max(100).optional(), state: z.enum(['all', 'passed', 'failed', 'skipped']).optional(), release: z.string().max(40).optional().describe('A release id: only the runs of that release.'), runs: z.enum(['all', 'latest']).optional().describe('`latest` keeps only the latest run of each verification, which is what the figures count.') }),
  async read({ q = '', state = 'all', release = '', runs = 'all' }) {
    // The one way the tool sees runs: the read the page uses, so the figures it is told are the figures on the screen.
    const { rows, observedAt } = await readRuns();
    const { latest, failing, skipped } = testFigures(rows);
    return { context: testsContext(rows, observedAt, { q, state, release, runs }), data: { latest: latest.length, failing: failing.length, skipped: skipped.length } };
  },
});

export const releasesTool = defineViewTool({
  name: 'releases',
  title: 'Releases',
  description: 'The releases: which version is live in each environment, which are ready to go out, and for those still in testing which required verification is missing, failed or skipped.',
  needs: FEATURES.releases.needs,
  input: z.object({ q: z.string().max(100).optional(), state: z.enum(['all', 'testing', 'ready', 'released']).optional(), environment: z.enum(['all', 'staging', 'production']).optional() }),
  async read({ q = '', state = 'all', environment = 'all' }) {
    const { rows, observedAt } = await readReleases();
    const { live, ready, testing } = releaseFigures(rows);
    return { context: releasesContext(rows, observedAt, { q, state, environment }), data: { live: live.length, ready, testing } };
  },
});

/** Every view's tool. The assistant route hands these to `assistantTools`, as it hands the collections. */
export const viewTools: ViewTool[] = [homeTool, requestsTool, requestTool, servicesTool, nowTool, usageTool, revenueTool, customersTool, customerTool, membersTool, keysTool, ticketsTool, testsTool, releasesTool] as ViewTool[];
