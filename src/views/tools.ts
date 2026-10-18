/**
 * Every view's tool, in one list (decision 0011): the console's assistant offers each as a read-only `view_<name>`
 * tool, an MCP server registers the same contracts under its own prefix (`docs/agents.md`), and the pages and embed
 * routes render from the same `read`. Server only: the reads go through `read()`, scoped to whoever is asking.
 *
 * A product points these at its data the way it points the collections: replace a `read`, keep its contract.
 */
import { z } from 'zod';
import { slug } from '@/app.config';
import { can, requireNeed, resolveAccess } from '@/data/access';
import { clock } from '@/data/collections';
import { FEATURES } from '@/data/features';
import { readLatestFrom, readRequests, REQUEST_PAGE } from '@/data/requests';
import { readReleases, readRuns } from '@/data/engineering';
import { attempt } from '@/data/main';
import { readTickets } from '@/data/tickets';
import { read, readActivity, readAll, readDays, readEndpoints, readIncidents, readResponses, readServices, revisionsOf } from '@/data/metrics';
import {
  DEMO_UPDATED_AT, STATUS_TEXT, payloadsOf, traceOf,
  type ApiKey, type ComputeRow, type CostRow, type CustomerRecord, type Member, type Model, type RequestRow, type Ticket, type UsageRow,
} from '@/data/sample';
import { PERIODS } from '@/lib/period';
import { defineViewTool, type ViewTool } from '@/lib/shared-context';
import { usageContext } from './usage-context';
import { usageExplore } from './usage-explore';
import { usageData } from './usage-parts';
import { usageFigures } from '@/data/usage';
import { customerRow, customersContext, under } from './customers-context';
import { customersExplore } from './customers-explore';
import { LATEST, customerContext, type CustomerData } from './customer-context';
import { customerExplore } from './customer-explore';
import { servicesContext, servicesHead, type ServicesData } from './services-context';
import { servicesExplore } from './services-explore';
import { SCOPES } from './key-scopes';
import { keysContext } from './keys-context';
import { keysExplore } from './keys-explore';
import { membersContext } from './members-context';
import { membersExplore } from './members-explore';
import { nowContext } from './now-context';
import { nowExplore } from './now-explore';
import { nowData } from './now-parts';
import { homeContext } from './home-context';
import { homeExplore } from './home-explore';
import { homeData } from './home-parts';
import { requestContext } from './request-context';
import { requestExplore } from './request-explore';
import { revenueContext } from './revenue-context';
import { revenueExplore } from './revenue-explore';
import { revenueData } from './revenue-parts';
import { requestsContext } from './requests-context';
import { requestsExplore } from './requests-explore';
import { releaseFigures, releasesContext } from './releases-context';
import { releasesExplore } from './releases-explore';
import { testFigures, testsContext } from './tests-context';
import { testsExplore } from './tests-explore';
import { ticketCounts, ticketsContext } from './tickets-context';
import { ticketsExplore } from './tickets-explore';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('A day of the period, YYYY-MM-DD: the view opens pointed at it.');
const period = z.enum(PERIODS).optional().describe('The reporting period, in complete days counted back from yesterday: 7d, 30d or 90d, each compared with the same number of days before it, or all, every complete day kept, which has no period before it. 30d when not given.');
const updatedAt = () => DEMO_UPDATED_AT.toISOString();

/**
 * Every complete day kept, oldest first: what a title's record and a context's first, total and days inside the band
 * are worked out from. Read on the server and never handed to the browser, which gets the sentences. Null when it could
 * not be read: the page is then headed by what it can state without them, and the rest of it stands.
 */
const readHistory = () => attempt(async () => (await readDays('all')).series);

/** Every row of a collection, or null when it could not be read. */
const rowsOf = <T>(name: string) => attempt(async () => (await readAll(name)).rows as T[]);

export const homeTool = defineViewTool({
  name: 'home',
  title: 'Home',
  description: 'The company over a period: revenue, customers, tokens served, requests, the days inside the band and compute in use, each with its change; the year at a period a window and the facts it holds; what we sell by model; the Business and Engineering workspaces at a glance; and what is worth knowing across the company.',
  needs: FEATURES.home.needs,
  page: '/',
  input: z.object({ period, day }),
  resourceUri: `ui://${slug}/home`,
  async read({ period: p = '30d', day: d }) {
    await requireNeed(FEATURES.home.needs);
    // What compute cost is read only by a person who may read it, asked as `read()` and the assistant's query ask it,
    // once: for anyone else it is not read at all, and the data carries nothing in its place.
    const mayCost = await can(await resolveAccess(), 'costs', 'read');
    // Each read apart from the others: one that fails leaves its part saying so and the rest standing.
    const { value: [days, history, customers, usage, models, compute, costs, services, incidents, releases, tickets], revisions } = await revisionsOf(() => Promise.all([
      attempt(() => readDays(p)), readHistory(), rowsOf<CustomerRecord>('customers'), rowsOf<UsageRow>('usage'), rowsOf<Model>('models'), rowsOf<ComputeRow>('compute'),
      mayCost ? rowsOf<CostRow>('costs') : undefined,
      attempt(readServices), attempt(async () => (await readIncidents()).all), attempt(async () => (await readReleases()).rows), rowsOf<Ticket>('tickets'),
    ]));
    const data = homeData({
      period: p, day: d ?? null, days, history, customers, usage, models, compute, ...(mayCost ? { costs } : {}), services, incidents, releases, tickets,
      updatedAt: updatedAt(), now: days?.observedAt ?? clock().toISOString(),
    });
    const index = d ? data.series.findIndex((x) => x.date === d) : -1;
    // The revisions the reads were served at ride with the data, so the page's stream asks what moved since instead of reading it all again.
    return { context: homeContext(data, index >= 0 ? index : null), data: { ...data, revisions } };
  },
  explore: homeExplore,
});

export const requestsTool = defineViewTool({
  name: 'requests',
  title: 'Requests',
  description: 'The request log, filtered: how many match, their errors and latency against the half hour before, the newest of them, and what they have in common.',
  needs: FEATURES.requests.needs,
  page: '/requests',
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
  explore: requestsExplore,
});

export const requestTool = defineViewTool({
  name: 'request',
  title: 'Request',
  description: 'One request by its id: how it ended, where its time went, and how its latency compares with its route.',
  needs: FEATURES.request.needs,
  page: '/requests/[id]',
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
  explore: requestExplore,
});

export const servicesTool = defineViewTool({
  name: 'services',
  title: 'Services',
  description: 'Every service in the team\'s order, now and over 90 days, with its uptime and how long it has run; the uptime of all of them and the longest clean run; the days inside the latency and error band; and every incident, the open ones first with their owners, tickets and how long they have lasted so far, then the resolved ones with how long each lasted.',
  needs: FEATURES.services.needs,
  page: '/services',
  input: z.object({}),
  async read() {
    await requireNeed(FEATURES.services.needs);
    // The incidents are read apart: a read that fails leaves their part saying so and every service standing.
    const [services, incidents, history] = await Promise.all([readServices(), attempt(readIncidents), readHistory()]);
    const data: ServicesData = {
      services, incidents: incidents && { open: incidents.open, resolved: incidents.past }, head: servicesHead({ services, history }), updatedAt: updatedAt(), now: clock().toISOString(),
    };
    return { context: servicesContext(data), data };
  },
  explore: servicesExplore,
});

export const nowTool = defineViewTool({
  name: 'now',
  title: 'Now',
  description: 'Engineering now: every service and the incidents nobody has resolved, with their owners and tickets; the days inside the latency and error band with their facts; each model over the last 30 complete days; compute in use a region; what ships; the work, with the reader\'s own marked; the slowest endpoints; the releases out, tickets closed, runs passed and incidents resolved over the last 30 complete days; the runs a day; and the latest changes.',
  needs: FEATURES.now.needs,
  page: '/engineering',
  input: z.object({}),
  resourceUri: `ui://${slug}/now`,
  async read() {
    await requireNeed(FEATURES.now.needs);
    // Each read apart from the others: one that fails leaves its part saying so and the rest standing.
    const { value: [access, services, incidents, releases, runs, history, usage, models, compute, endpoints, tickets, activity], revisions } = await revisionsOf(() => Promise.all([
      resolveAccess(), attempt(readServices), attempt(async () => (await readIncidents()).all), attempt(async () => (await readReleases()).rows), attempt(async () => (await readRuns()).rows),
      readHistory(), rowsOf<UsageRow>('usage'), rowsOf<Model>('models'), rowsOf<ComputeRow>('compute'), attempt(readEndpoints), attempt(async () => (await readTickets()).rows), attempt(readActivity),
    ]));
    const data = nowData({ services, incidents, releases, runs, history, usage, models, compute, endpoints, tickets, activity, reader: access.subjectId, updatedAt: updatedAt(), now: clock().toISOString() });
    return { context: nowContext(data), data: { ...data, revisions } };
  },
  explore: nowExplore,
});

export const usageTool = defineViewTool({
  name: 'usage',
  title: 'Usage',
  description: 'Requests over a period against the period before, with the line of errors and latency under the title and the facts of the period; requests a day; a year of requests a day; and, over the last 30 complete days, when they come by hour and by weekday and hour, where from by region, what is asked for by endpoint and how it was answered by status class.',
  needs: FEATURES.usage.needs,
  page: '/usage',
  input: z.object({ period, day }),
  async read({ period: p = '30d', day: d }) {
    await requireNeed(FEATURES.usage.needs);
    // Each read apart from the others: one that fails leaves its part saying so and the rest standing.
    const [days, history, figures, endpoints, responses] = await Promise.all([attempt(() => readDays(p)), readHistory(), attempt(() => usageFigures()), attempt(readEndpoints), attempt(readResponses)]);
    const data = usageData({ period: p, day: d ?? null, days, history, figures, endpoints, responses, updatedAt: updatedAt(), now: days?.observedAt ?? clock().toISOString() });
    // The Meridian's days, as the page points at them: the period's complete days, then the day in progress.
    const index = d ? [...(data.days?.series ?? []), ...(data.days?.running ? [data.days.running] : [])].findIndex((x) => x.date === d) : -1;
    return { context: usageContext(data, index >= 0 ? index : null), data };
  },
  explore: usageExplore,
});

export const customersTool = defineViewTool({
  name: 'customers',
  title: 'Customers',
  description: 'The customers that have not left, with plan, status, requests, revenue and error rate: how many there are, where revenue concentrates, who is moving against the rest, and who fails most. A customer that has left is counted in nothing and listed under the status left.',
  needs: FEATURES.customers.needs,
  page: '/customers',
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
  explore: customersExplore,
});

export const revenueTool = defineViewTool({
  name: 'revenue',
  title: 'Revenue',
  description: 'Revenue over a period against the period before and against a year ago, the best day yet, revenue by plan and who pays it, who is past due, every customer\'s week, the customers on each plan from a trial to Enterprise, what is worth a look, what they buy by model and where they are by region.',
  needs: FEATURES.revenue.needs,
  page: '/business',
  input: z.object({ period }),
  async read({ period: p = '30d' }) {
    await requireNeed(FEATURES.revenue.needs);
    // Each read apart from the others: one that fails leaves its part saying so and the rest standing.
    const { value: [days, history, customers, usage, models, regions], revisions } = await revisionsOf(() => Promise.all([
      attempt(() => readDays(p)), readHistory(), rowsOf<CustomerRecord>('customers'), rowsOf<UsageRow>('usage'), rowsOf<Model>('models'), rowsOf<{ label: string; value: number }>('regions'),
    ]));
    const data = revenueData({ period: p, days, history, customers, usage, models, regions, updatedAt: updatedAt(), now: days?.observedAt ?? clock().toISOString() });
    return { context: revenueContext(data), data: { ...data, revisions } };
  },
  explore: revenueExplore,
});

/**
 * One customer's page data, or null when no customer has the id: the page and the tool read it the same way. Beside
 * its record, the product's revenue and error rate over the same 30 complete days and its newest requests in the
 * sampled log, each read apart: one that fails is null and its part says so, and one the person may not read is left
 * out, with nothing in its place.
 */
export async function readCustomer(id: string): Promise<CustomerData | null> {
  const { rows } = await read('customers', { where: [{ field: 'id', op: 'eq', value: id }], limit: 1 });
  const customer = rows[0] as CustomerRecord | undefined;
  if (!customer) return null;
  const access = await resolveAccess();
  const [mayDays, mayLog] = await Promise.all([can(access, 'days', 'read'), can(access, 'requests', 'read')]);
  const [days, latest] = await Promise.all([
    mayDays ? attempt(() => readDays('30d')) : undefined,
    mayLog ? attempt(() => readLatestFrom(customer.name, LATEST)) : undefined,
  ]);
  return {
    customer,
    ...(days === undefined ? {} : { product: days && { revenue: days.totals.current.revenue, errorRate: days.totals.current.errorRate } }),
    ...(latest === undefined ? {} : { latest }),
    updatedAt: updatedAt(),
    now: clock().toISOString(),
  };
}

export const customerTool = defineViewTool({
  name: 'customer',
  title: 'Customer',
  description: 'One customer by its id: its plan and where it stands since when, its owner on our side, what it asked of the API and was billed in the last 30 days with its share of revenue, its error rate against the product\'s, how its last 14 days moved, what it asks for by endpoint, and its latest requests in the sampled log.',
  needs: FEATURES.customer.needs,
  page: '/customers/[id]',
  input: z.object({ id: z.string().min(1).max(60) }),
  async read({ id }) {
    await requireNeed(FEATURES.customer.needs);
    const data = await readCustomer(id);
    if (!data) throw new Error(`No customer with the id ${id}.`);
    return { context: customerContext(data), data };
  },
  explore: customerExplore,
});

export const membersTool = defineViewTool({
  name: 'members',
  title: 'Members',
  description: 'Everyone in the workspace with role, team, status and when they were last seen; who has gone quiet and which invitations wait.',
  needs: FEATURES.members.needs,
  page: '/members',
  input: z.object({}),
  async read() {
    await requireNeed(FEATURES.members.needs);
    const { rows, observedAt } = await readAll('members', { sort: { field: 'joined', dir: 'desc' } });
    return { context: membersContext(rows as Member[], observedAt), data: {} };
  },
  explore: membersExplore,
});

export const keysTool = defineViewTool({
  name: 'keys',
  title: 'API keys',
  description: 'Every API key with owner, scopes and last use; which live keys sit unused or carry every scope. Never a secret.',
  needs: FEATURES.keys.needs,
  page: '/keys',
  input: z.object({}),
  async read() {
    await requireNeed(FEATURES.keys.needs);
    const { rows, observedAt } = await readAll('keys');
    return { context: keysContext(rows as ApiKey[], observedAt, SCOPES), data: {} };
  },
  explore: keysExplore,
});

export const ticketsTool = defineViewTool({
  name: 'tickets',
  title: 'Tickets',
  description: 'The tickets the team tracks against a service: how many are open, waiting and closed, which are unowned or have gone quiet, and the newest changes.',
  needs: FEATURES.tickets.needs,
  page: '/operations-tickets',
  input: z.object({ q: z.string().max(100).optional(), state: z.enum(['all', 'open', 'waiting', 'closed']).optional(), priority: z.enum(['all', 'high', 'normal', 'low']).optional() }),
  async read({ q = '', state = 'all', priority = 'all' }) {
    // The one way the tool sees tickets: the read the page uses, so the figures it is told are the figures on the screen.
    const { rows, observedAt } = await readTickets();
    return { context: ticketsContext(rows, observedAt, { q, state, priority }), data: { counts: ticketCounts(rows) } };
  },
  explore: ticketsExplore,
});

export const testsTool = defineViewTool({
  name: 'tests',
  title: 'Tests',
  description: 'The verification runs: how many verifications have a latest run, how many are failing or skipped, why the failing ones failed, and the newest runs.',
  needs: FEATURES.tests.needs,
  page: '/tests',
  input: z.object({ q: z.string().max(100).optional(), state: z.enum(['all', 'passed', 'failed', 'skipped']).optional(), release: z.string().max(40).optional().describe('A release id: only the runs of that release.'), runs: z.enum(['all', 'latest']).optional().describe('`latest` keeps only the latest run of each verification, which is what the figures count.') }),
  async read({ q = '', state = 'all', release = '', runs = 'all' }) {
    // The one way the tool sees runs: the read the page uses, so the figures it is told are the figures on the screen.
    const { rows, observedAt } = await readRuns();
    const { latest, failing, skipped } = testFigures(rows);
    return { context: testsContext(rows, observedAt, { q, state, release, runs }), data: { latest: latest.length, failing: failing.length, skipped: skipped.length } };
  },
  explore: testsExplore,
});

export const releasesTool = defineViewTool({
  name: 'releases',
  title: 'Releases',
  description: 'The releases: which version is live in each environment, which are ready to go out, and for those still in testing which required verification is missing, failed or skipped.',
  needs: FEATURES.releases.needs,
  page: '/releases',
  input: z.object({ q: z.string().max(100).optional(), state: z.enum(['all', 'testing', 'ready', 'released']).optional(), environment: z.enum(['all', 'staging', 'production']).optional() }),
  async read({ q = '', state = 'all', environment = 'all' }) {
    const { rows, observedAt } = await readReleases();
    const { live, ready, testing } = releaseFigures(rows);
    return { context: releasesContext(rows, observedAt, { q, state, environment }), data: { live: live.length, ready, testing } };
  },
  explore: releasesExplore,
});

/** Every view's tool. The assistant route hands these to `assistantTools`, as it hands the collections. */
export const viewTools: ViewTool[] = [homeTool, requestsTool, requestTool, servicesTool, nowTool, usageTool, revenueTool, customersTool, customerTool, membersTool, keysTool, ticketsTool, testsTool, releasesTool] as ViewTool[];
