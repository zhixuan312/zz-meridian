/**
 * The company's records: one company that sells tokens, priced once. Its days, what each model answered on each of them,
 * the GPUs it ran and what they cost, its customers, and the four snapshots of the last 30 complete days (endpoints,
 * regions, status classes, and the weekday and hour grid) are all made here, by one seeded generator at the sample's
 * fixed clock, so the server and the client render the same figures and no two pages can disagree.
 *
 * Every identity holds because of how a figure is made, never by a correction afterwards. Money is whole cents and a
 * count is a whole number; a total is divided by `split`, whose parts always sum to it. A model's day is its tokens at
 * the model's price, rounded to the cent once; a day is the sum of its four rows; a day's revenue is divided among the
 * plans and a plan's 30 days among its customers; and the requests of those 30 days are divided among the endpoints, the
 * regions, the status classes, the weekday grid and the customers. A route the request log shows a customer calling is
 * one its mix counts: requests are moved into it from the customer's other routes, never added.
 *
 * It holds the 360 complete days before the clock's own day, and that day as far as the clock has come: the day in
 * progress is the last row of the days, the usage, the compute and the costs, and is counted in no period, no
 * customer's figures and no snapshot. No client module of a page imports this file: it is a year of records a browser
 * is never shown (tests/client-imports.test.ts).
 */
import { PERIOD_DAYS, type Period } from '@/lib/period';
import { totalsOf } from '@/lib/totals';
import { DEMO_NOW, MODELS, NAMED_CUSTOMERS, PLANS, REGION_NAMES, REQUESTS, ROUTES, seeded, type ComputeRow, type CostRow, type CustomerRecord, type DailyPoint, type Endpoint, type Plan, type UsageRow } from '@/system/fixtures/sample';
import { MEMBERS } from '@/system/fixtures/sample-members';

const DAY = 86_400_000;
/** The complete days kept: 2025-10-08 to 2026-10-02 at the sample's clock. */
const KEPT = 360;
/** The days a customer's figures and the four snapshots cover. */
const WINDOW = 30;
const TODAY = Date.parse(`${DEMO_NOW.toISOString().slice(0, 10)}T00:00:00Z`);
/** The day `n` days before the clock's own day, YYYY-MM-DD; a negative `n` is a day after it. */
const back = (n: number) => new Date(TODAY - n * DAY).toISOString().slice(0, 10);

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const cents = (usd: number) => Math.round(usd * 100);

/**
 * Whole parts of `total` in proportion to `weights`, summing to it exactly: each part is rounded down, and the units
 * left over go one each to the parts that lost the most by it. A weight of zero gets nothing.
 */
function split(total: number, weights: number[]): number[] {
  const whole = sum(weights);
  const exact = weights.map((w) => (total * w) / whole);
  const parts = exact.map(Math.floor);
  const order = exact.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0, left = total - sum(parts); k < left; k++) parts[order[k][1]]++;
  return parts;
}

// ── The days ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Requests on an ordinary weekday at the start of the year kept. */
const BASE = 19_000_000;
/** What a request to each model reads and writes, how often it fails, and how fast it answers on an ordinary day. */
const SHAPE: Record<string, { input: number; output: number; errors: number; p95: number; ttft: number; tps: number }> = {
  'meridian-large': { input: 6000, output: 600, errors: 0.0052, p95: 840, ttft: 430, tps: 58 },
  'meridian-swift': { input: 2700, output: 300, errors: 0.0036, p95: 480, ttft: 190, tps: 142 },
  'meridian-embed': { input: 2000, output: 0, errors: 0.0035, p95: 240, ttft: 0, tps: 0 },
  none: { input: 0, output: 0, errors: 0.00346, p95: 420, ttft: 0, tps: 0 },
};
/** Each region's share of the requests and of the GPUs, and its median latency (ms). eu-west-1 has the least room. */
const REGION_SHAPE = [
  { requests: 1_402_000, gpus: 0.44, p50: 92 },
  { requests: 912_400, gpus: 0.25, p50: 118 },
  { requests: 538_100, gpus: 0.19, p50: 164 },
  { requests: 282_420, gpus: 0.12, p50: 101 },
];
/** US dollars a GPU-hour, and the tokens a GPU-hour serves. */
const GPU_RATE = 2.5;
const TOKENS_A_GPU_HOUR = 7_300_000;
/** The UTC hour the Sunday batch runs in. */
const BATCH_HOUR = 22;
/** How a day's requests fall across its UTC hours, before each hour's own noise: an afternoon peak, flatter at a weekend, and a smaller one at night. */
const hourly = (weekend: boolean, h: number) => (weekend ? 0.2 : 0.12) + (weekend ? 0.6 : 0.9) * Math.exp(-((h - 14.5) ** 2) / 22) + 0.28 * Math.exp(-((h - 3) ** 2) / 10);

/** The complete days, oldest first, and what each model answered, each region ran and the GPUs cost on each of them. */
export const USAGE: UsageRow[] = [];
export const DAYS: DailyPoint[] = [];
export const COMPUTE: ComputeRow[] = [];
export const COSTS: CostRow[] = [];
/** Each day's requests from the batch that runs late on a Sunday; the weekday grid puts them in their hour. */
const BATCH: number[] = [];

const rand = seeded(0x5eed);
const traffic = sum(REGION_SHAPE.map((r) => r.requests));

/**
 * The records of the day `n` days after the first day kept, as far as its first `hours` hours: all 24 for a complete
 * day. A day in progress holds the requests that arrive in the hours it has had, and its GPUs for those hours.
 */
function dayOf(n: number, hours = 24) {
  const before = KEPT - n;
  const date = back(before), weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const weekend = weekday === 0 || weekday === 6;
  // The share of the day's requests that arrive in the hours it has had: all of them for a complete day.
  const arrived = hours === 24 ? 1 : sum(Array.from({ length: hours }, (_, h) => hourly(weekend, h))) / sum(Array.from({ length: 24 }, (_, h) => hourly(weekend, h)));
  // A year of growth, one soft month in June that the next three periods of 30 days each beat, and a monthly rhythm
  // that leaves every period's total alone.
  const level = (1 + n / 300) * (1 - 0.22 * Math.exp(-(((n - 254.5) / 11) ** 2))) * (1 - 0.03 * Math.cos((2 * Math.PI * (n - 345)) / WINDOW));
  const organic = Math.round(BASE * (weekday === 0 ? 0.4 : weekday === 6 ? 0.62 : weekday === 1 ? 0.94 : 1) * level * (0.95 + rand() * 0.1) * arrived);
  // The batch is in a day once its hour has passed.
  const batch = weekday === 0 && hours > BATCH_HOUR ? Math.round(BASE * 0.26 * level * (0.96 + rand() * 0.08)) : 0;
  // The three days outside the band, where the services' strips mark them: the Inference API 11 and 12 days before
  // the clock, and Files 47 days before.
  const inference = before === 11 || before === 12, files = before === 47;
  // Customers moved to the large model through the year.
  const large = 0.28 + (0.04 * n) / (KEPT - 1);
  const answered = split(organic, [0.424 * large * (0.98 + rand() * 0.04), 0.424 * (1 - large), 0.134 * (0.97 + rand() * 0.06), 0.442 * (0.98 + rand() * 0.04)]);
  // The batch embeds: it is the embedding model's.
  answered[2] += batch;
  const rows = MODELS.map((m, k): UsageRow => {
    const shape = SHAPE[m.id], requests = answered[k];
    const writes = m.outputPrice !== null;
    const hit = m.callPrice === null ? inference && writes : files;
    const inputTokens = Math.round(requests * shape.input * (0.97 + rand() * 0.06));
    const outputTokens = writes ? Math.round(requests * shape.output * (0.97 + rand() * 0.06)) : 0;
    const slow = (0.95 + rand() * 0.1) * (weekend ? 0.94 : 1) * (hit ? (writes ? 1.9 : 2.4) : 1);
    return {
      id: `${date}:${m.id}`, date, model: m.id, requests, inputTokens, outputTokens,
      // Priced once: tokens at the model's price, or calls at the price of a call, to the cent.
      revenue: (m.callPrice !== null ? Math.round(requests * m.callPrice * 100) : Math.round((inputTokens * (m.inputPrice ?? 0) + outputTokens * (m.outputPrice ?? 0)) / 10_000)) / 100,
      errors: Math.round(requests * shape.errors * (0.85 + rand() * 0.3) * (hit ? (writes ? 6 : 4.5) : 1)),
      p95: Math.round(shape.p95 * slow),
      ttft: writes ? Math.round(shape.ttft * slow) : null,
      tps: writes ? Math.round((shape.tps / (hit ? 1.6 : 1)) * (0.96 + rand() * 0.08)) : null,
    };
  });

  const paid = sum(rows.map((u) => cents(u.revenue)));
  const enterprise = 0.6 + 0.03 * Math.sin(n / 40);
  const [byEnterprise, byScale, byStarter] = split(paid, [enterprise, 0.27, 0.73 - enterprise]);
  const tokens = sum(rows.map((u) => u.inputTokens + u.outputTokens));
  const day: DailyPoint = {
    date,
    requests: sum(rows.map((u) => u.requests)),
    errors: sum(rows.map((u) => u.errors)),
    p95: Math.round((268 + rand() * 60 + (inference || files ? 190 : 0)) * (weekend ? 0.92 : 1)),
    tokens,
    revenue: paid / 100,
    revenueByPlan: { Enterprise: byEnterprise / 100, Scale: byScale / 100, Starter: byStarter / 100 },
  };

  // Thirty more GPUs every 30 days, from 360 to 690, and never one fewer. The day in progress runs on yesterday's.
  const gpus = split(360 + 30 * Math.floor(Math.min(n, KEPT - 1) / WINDOW), REGION_SHAPE.map((r) => r.gpus));
  const compute = REGION_NAMES.map((region, k): ComputeRow => {
    const offered = gpus[k] * hours;
    const share = REGION_SHAPE[k].requests / traffic;
    return { id: `${date}:${region}`, date, region, gpus: gpus[k], used: Math.round(offered * Math.min(0.97, ((tokens * share) / (offered * TOKENS_A_GPU_HOUR)) * (0.97 + rand() * 0.06))) };
  });
  const cost: CostRow = { date, compute: sum(gpus) * hours * GPU_RATE };
  return { day, usage: rows, compute, cost, batch };
}

for (let n = 0; n < KEPT; n++) {
  const made = dayOf(n);
  USAGE.push(...made.usage);
  DAYS.push(made.day);
  COMPUTE.push(...made.compute);
  COSTS.push(made.cost);
  BATCH.push(made.batch);
}

/**
 * The day in progress: the clock's own day, with what has arrived by the clock (nine hours at the sample's 09:00 UTC).
 * It is made as every day is, so its four usage rows sum to it and each is priced at its model's price. The
 * collections hold it as the last row of the days, the usage, the compute and the costs; nothing here counts it.
 */
export const IN_PROGRESS = (({ batch: _, ...records }) => records)(dayOf(KEPT, DEMO_NOW.getUTCHours()));

// ── The last 30 complete days, four ways ─────────────────────────────────────────────────────────────────────────────

const MONTH = DAYS.slice(-WINDOW);
const MONTH_DATES = new Set(MONTH.map((d) => d.date));
const MONTH_REQUESTS = sum(MONTH.map((d) => d.requests));
const sent = (...models: string[]) => USAGE.filter((u) => MONTH_DATES.has(u.date) && models.includes(u.model));
const share = (errors: number, requests: number) => Math.round((errors / requests) * 10_000) / 10_000;

/**
 * Each endpoint over the last 30 complete days. `/v1/messages` is what the two models that serve it answered and
 * `/v1/embeddings` what the embedding model did; the other five divide the calls that reached no model, and their errors.
 */
export const ENDPOINTS: Endpoint[] = (() => {
  /** How the calls that reach no model divide among their five routes, and how often each fails. */
  const calls: Record<string, [number, number]> = { '/v1/search': [846_300, 0.0022], '/v1/documents/:id': [301_910, 0.0011], '/v1/files': [120_450, 0.0188], '/v1/sessions/:id': [48_230, 0.0009], '/v1/webhooks/:id': [21_070, 0.0064] };
  const routes = Object.keys(calls);
  const requests = split(sum(sent('none').map((u) => u.requests)), routes.map((r) => calls[r][0]));
  const errors = split(sum(sent('none').map((u) => u.errors)), routes.map((r, k) => requests[k] * calls[r][1]));
  return ROUTES.map(({ method, route, p95 }) => {
    const models = MODELS.filter((m) => m.serves === route).map((m) => m.id);
    if (models.length) return { method, route, requests: sum(sent(...models).map((u) => u.requests)), errorRate: share(sum(sent(...models).map((u) => u.errors)), sum(sent(...models).map((u) => u.requests))), p95 };
    const k = routes.indexOf(route);
    return { method, route, requests: requests[k], errorRate: share(errors[k], requests[k]), p95 };
  });
})();

/** The `n` busiest endpoints and each one's share of the 30 days' requests, as the Usage page's endpoint list divides them. */
export function busiestRoutes(n: number): { route: string; share: number }[] {
  const served = sum(ENDPOINTS.map((e) => e.requests));
  return [...ENDPOINTS].sort((a, b) => b.requests - a.requests).slice(0, n).map((e) => ({ route: e.route, share: e.requests / served }));
}

/** Requests and median latency (ms) for each region over the last 30 complete days, in the order Usage draws them. */
export const REGIONS = split(MONTH_REQUESTS, REGION_SHAPE.map((r) => r.requests)).map((value, k) => ({ label: REGION_NAMES[k], value, p50: REGION_SHAPE[k].p50 }));

/**
 * Responses by status class over the last 30 complete days. The classes start from the days' errors, which are the 5xx
 * and the 429: most of them are 5xx, the rest are the 429 among the 4xx.
 */
export const STATUS_MIX = (() => {
  const errors = sum(MONTH.map((d) => d.errors));
  const server = Math.round(errors * 0.58);
  const client = errors - server + Math.round(MONTH_REQUESTS * 0.0335);
  const redirects = Math.round(MONTH_REQUESTS * 0.0196);
  return [
    { label: '2xx', value: MONTH_REQUESTS - redirects - client - server },
    { label: '3xx', value: redirects },
    { label: '4xx', value: client },
    { label: '5xx', value: server },
  ];
})();

/**
 * Requests for each weekday (0 is Monday) and UTC hour over the last 30 complete days: each weekday's days divided
 * among its hours, and the Sunday batch in the hour it runs.
 */
export const WEEKDAY_HOURS = (() => {
  const rand = seeded(0xbeef);
  return Array.from({ length: 7 }, (_, weekday) => {
    const days = MONTH.map((d, i) => ({ ...d, batch: BATCH[KEPT - WINDOW + i] })).filter((d) => (new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7 === weekday);
    const weekend = weekday > 4;
    const shape = Array.from({ length: 24 }, (_, h) => hourly(weekend, h) * (0.93 + rand() * 0.14));
    const cells = split(sum(days.map((d) => d.requests - d.batch)), shape);
    cells[BATCH_HOUR] += sum(days.map((d) => d.batch));
    return cells.map((requests, hour) => ({ id: `${weekday}-${hour}`, weekday, hour, requests }));
  }).flat();
})();

// ── The customers ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Customers that have not left, by plan. */
const SIZE: Record<Plan, number> = { Enterprise: 24, Scale: 82, Starter: 214 };
/** How a plan's revenue falls away from its largest customer to its smallest. */
const CURVE: Record<Plan, (i: number) => number> = { Enterprise: (i) => 1 / (i + 1.6), Scale: (i) => 1 / (i + 3) ** 0.8, Starter: (i) => 1 / (i + 4) ** 0.7 };
/** The twelve named customers' plans, in the order of `NAMED_CUSTOMERS`: three, five and four. */
const NAMED: Record<Plan, string[]> = { Enterprise: NAMED_CUSTOMERS.slice(0, 3), Scale: NAMED_CUSTOMERS.slice(3, 8), Starter: NAMED_CUSTOMERS.slice(8) };
/** What each release has shown of the twelve, kept: where each runs, how often its requests fail and its seats. */
const NAMED_FACTS = {
  region: [0, 1, 0, 2, 1, 3, 0, 1, 0, 2, 1, 3],
  errorRate: [0.004, 0.0021, 0.0063, 0.0012, 0.0094, 0.0031, 0.0018, 0.0142, 0.0027, 0.0056, 0.0009, 0.0038],
  seats: [148, 96, 74, 41, 33, 27, 22, 18, 12, 9, 6, 3],
};
/**
 * Every other customer's name is one word of each list. Both lists are invented for the sample, and a name that
 * matches a real company does so by chance (see the note in ./sample).
 */
const FIRST = [
  'Aldera', 'Arclight', 'Bexwell', 'Briarmoor', 'Caldwick', 'Cinderfen', 'Corvane', 'Dellmark', 'Driftwell', 'Eastmere', 'Elmhollow', 'Fenwright', 'Glenmoor', 'Halewick', 'Harrowby', 'Inkwell',
  'Ivorne', 'Juniperth', 'Kelbrook', 'Lakemoor', 'Larkfield', 'Marrowby', 'Merrin', 'Nettlow', 'Norhaven', 'Oakmere', 'Orrin', 'Pellham', 'Quenby', 'Ravenmoor', 'Rookhaven', 'Saltwick',
  'Sedgemoor', 'Thistlewood', 'Tolland', 'Umberly', 'Vantry', 'Wexcombe', 'Wrenfield', 'Yarrowby', 'Ambervale', 'Ashcombe', 'Birchmere', 'Blythe', 'Coppergate', 'Dunmoor', 'Everwick', 'Farrowdale',
  'Greywell', 'Hollin', 'Ironvale', 'Kestwick', 'Lindmoor', 'Mossgate', 'Northmere', 'Pinehollow', 'Redwick', 'Stonemere', 'Tidewell', 'Westmoor', 'Whitlow', 'Windrush', 'Wolden', 'Zephyrine',
];
const SECOND = ['Labs', 'Systems', 'Health', 'Logistics', 'Analytics', 'Robotics', 'Media', 'Foods', 'Travel', 'Energy', 'Legal', 'Insurance', 'Biotech', 'Games', 'Works', 'Supply', 'Motors', 'Software', 'Networks', 'Studios', 'Pharma', 'Capital', 'Education', 'Security'];
/** Which customers use each route (the share that never call it) and how far their use of it varies, from and by. */
const USES: Record<string, [none: number, from: number, by: number]> = {
  '/v1/messages': [0, 0.7, 0.6], '/v1/search': [0.25, 0.4, 1.4], '/v1/embeddings': [0.35, 0.3, 1.9], '/v1/documents/:id': [0.4, 0.4, 1.4],
  '/v1/files': [0.55, 0.3, 1.8], '/v1/sessions/:id': [0.2, 0.5, 1], '/v1/webhooks/:id': [0.6, 0.4, 1.6],
};

const idOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');

export const CUSTOMERS: CustomerRecord[] = (() => {
  const rand = seeded(0xc0de);
  /** Every pairing of the two lists, in a fixed shuffled order: a name is taken once, so none repeats. */
  const names = FIRST.flatMap((a) => SECOND.map((b) => `${a} ${b}`)).map((name) => [rand(), name] as const).sort((a, b) => a[0] - b[0]).map(([, name]) => name);
  let taken = 0;
  /** The people on our side who look after customers: the active members of Sales and Support who can change a record. */
  const owners = MEMBERS.filter((m) => m.status === 'Active' && m.role !== 'Viewer' && (m.team === 'Sales' || m.team === 'Support')).map((m) => m.name);

  /** What the generator knows of a customer beside its record: how much it calls for what it pays, and how its week is moving. */
  type Draft = CustomerRecord & { calls: number; slope: number };
  const drafts: Draft[] = [];
  for (const plan of PLANS) {
    // A plan's 30 days of revenue, divided among its customers: the named ones lead it in their order, and the others
    // follow, largest first.
    const lead = NAMED[plan].length;
    const weights = [
      ...Array.from({ length: lead }, (_, i) => CURVE[plan](i)),
      ...Array.from({ length: SIZE[plan] - lead }, (_, i) => CURVE[plan](lead + i) * (0.88 + rand() * 0.24)).sort((a, b) => b - a),
    ];
    const paid = split(sum(MONTH.map((d) => cents(d.revenueByPlan[plan]))), weights);
    for (let i = 0; i < SIZE[plan]; i++) {
      const name = NAMED[plan][i] ?? names[taken++];
      const named = NAMED_CUSTOMERS.indexOf(name);
      const [where, age, whose, fails, seats, calls] = Array.from({ length: 6 }, rand);
      drafts.push({
        id: idOf(name), name, plan, status: 'active',
        requests: 0, tokens: 0, revenue: paid[i] / 100, byEndpoint: {}, trend: [],
        errorRate: named >= 0 ? NAMED_FACTS.errorRate[named] : Math.round((0.0008 + fails ** 3 * 0.014) * 10_000) / 10_000,
        seats: named >= 0 ? NAMED_FACTS.seats[named] : plan === 'Enterprise' ? 40 + Math.floor(seats * 120) : plan === 'Scale' ? 8 + Math.floor(seats * 38) : 1 + Math.floor(seats * 9),
        region: REGION_NAMES[named >= 0 ? NAMED_FACTS.region[named] : where < 0.45 ? 0 : where < 0.74 ? 1 : where < 0.91 ? 2 : 3],
        owner: owners[Math.floor(whose * owners.length)],
        joined: back(plan === 'Enterprise' ? 380 + Math.floor(age * 700) : plan === 'Scale' ? 120 + Math.floor(age * 800) : 45 + Math.floor(age * 700)),
        planSince: null, previousPlan: null, left: null, trialEnds: null, pastDueSince: null,
        // A smaller customer sends more requests for each dollar it pays.
        calls: paid[i] ** 0.85 * (0.7 + calls * 0.6),
        // Every Enterprise customer's week is ahead of the company's; the others' go both ways.
        slope: plan === 'Enterprise' ? 0.02 + rand() * 0.05 : -0.09 + rand() * 0.2,
      });
    }
  }

  // Who is past due, who is on a trial and who changed plan: Lumen Studio and Brightline as every release has had them,
  // and the rest drawn from the customers no release has named.
  const of = (name: string) => drafts.find((c) => c.name === name)!;
  const draw = (plan: Plan, n: number) => drafts.filter((c) => c.plan === plan && c.status === 'active' && !c.previousPlan && !NAMED_CUSTOMERS.includes(c.name)).map((c) => [rand(), c] as const).sort((a, b) => a[0] - b[0]).slice(0, n).map(([, c]) => c);
  for (const c of [of('Lumen Studio'), ...draw('Scale', 3), ...draw('Starter', 6)]) {
    c.status = 'past due';
    c.pastDueSince = back(3 + Math.floor(rand() * 36));
  }
  for (const c of [of('Brightline'), ...draw('Scale', 2), ...draw('Starter', 11)]) {
    // A trial is 30 days from the day the customer joined, and ends within the next three weeks.
    const ends = 1 + Math.floor(rand() * 21);
    c.status = 'trial';
    c.trialEnds = back(-ends);
    c.joined = back(WINDOW - ends);
  }
  const moved = (plan: Plan, from: Plan, n: number) => {
    for (const c of draw(plan, n)) {
      const age = Math.round((TODAY - Date.parse(`${c.joined}T00:00:00Z`)) / DAY);
      c.previousPlan = from;
      c.planSince = back(1 + Math.floor(rand() * Math.min(age - WINDOW, 330)));
    }
  };
  moved('Enterprise', 'Scale', 6);
  moved('Scale', 'Starter', 14);
  moved('Starter', 'Scale', 4);

  // Each route's 30 days divided among the customers that use it, so the customers' requests by route are the endpoints'.
  for (const e of ENDPOINTS) {
    const [none, from, by] = USES[e.route];
    const weights = drafts.map((c) => {
      const [uses, much] = [rand(), rand()];
      return uses < none ? 0 : c.calls * (from + much * by);
    });
    split(e.requests, weights).forEach((n, i) => (drafts[i].byEndpoint[e.route] = n));
  }
  // The request log samples the named customers' requests, so a route it shows one of them calling is a route that
  // customer's mix counts. Where the draw above left such a route at nothing, the customer sends it what the median
  // customer that calls it sends, taken from its own largest route; and, of the customers no release names that call
  // both, the one that sends that route the most gives the same number back, from that route to the other. Requests
  // move and none is added, so no customer's requests and no endpoint's change, and nothing here draws from the stream.
  for (const [name, route] of [...new Set(REQUESTS.map((r) => `${r.customer}\n${r.route}`))].map((pair) => pair.split('\n'))) {
    const c = of(name);
    if (c.byEndpoint[route] > 0) continue;
    const callers = drafts.map((d) => d.byEndpoint[route]).filter((n) => n > 0).sort((a, b) => a - b);
    const median = callers[Math.floor(callers.length / 2)];
    const largest = ROUTES.map((r) => r.route).reduce((a, b) => (c.byEndpoint[b] > c.byEndpoint[a] ? b : a));
    const giver = drafts.filter((d) => !NAMED_CUSTOMERS.includes(d.name) && d.byEndpoint[largest] > 0).reduce((a, b) => (b.byEndpoint[route] > a.byEndpoint[route] ? b : a));
    c.byEndpoint[largest] -= median;
    c.byEndpoint[route] += median;
    giver.byEndpoint[route] -= median;
    giver.byEndpoint[largest] += median;
  }
  for (const c of drafts) c.requests = sum(Object.values(c.byEndpoint));
  // Tokens go with what a customer pays: its mix of models moves the price of a token a little either way.
  split(sum(MONTH.map((d) => d.tokens)), drafts.map((c) => cents(c.revenue) * (0.8 + rand() * 0.4))).forEach((n, i) => (drafts[i].tokens = n));
  // The last 14 days: each day's requests divided among the customers, so their trends sum to the days.
  DAYS.slice(-14).forEach((d, k) => split(d.requests, drafts.map((c) => c.requests * (1 + (c.slope * (k - 6.5)) / 7))).forEach((n, i) => drafts[i].trend.push(n)));

  // The nine that left during the year, each more than 30 days before the clock: the 30 days hold nothing of theirs.
  for (let i = 0; i < 9; i++) {
    const name = names[taken++], plan: Plan = i < 3 ? 'Scale' : 'Starter';
    const left = 40 + Math.floor(rand() * 300);
    drafts.push({
      id: idOf(name), name, plan, status: 'left',
      requests: 0, tokens: 0, revenue: 0, byEndpoint: Object.fromEntries(ROUTES.map((r) => [r.route, 0])), trend: Array.from({ length: 14 }, () => 0),
      errorRate: 0, seats: plan === 'Scale' ? 8 + Math.floor(rand() * 30) : 1 + Math.floor(rand() * 9),
      region: REGION_NAMES[Math.floor(rand() * REGION_NAMES.length)], owner: owners[Math.floor(rand() * owners.length)],
      joined: back(left + 60 + Math.floor(rand() * 500)), planSince: null, previousPlan: null, left: back(left), trialEnds: null, pastDueSince: null,
      calls: 0, slope: 0,
    });
  }
  return drafts.map(({ calls: _, slope: __, ...c }) => c);
})();

// ── What a preview and the Atlas draw ────────────────────────────────────────────────────────────────────────────────

/**
 * A period's complete days, oldest first and ending yesterday, the same number before them, and the day in progress on
 * its own. `all` is every complete day kept, with none before it.
 */
export function demoSeries(period: Period) {
  const n = PERIOD_DAYS[period];
  return { current: n ? DAYS.slice(-n) : DAYS, previous: n ? DAYS.slice(-2 * n, -n) : [], running: IN_PROGRESS.day };
}

/** Both periods' totals; the period before has none when no day comes before, as with `all`. */
export function demoTotals(period: Period) {
  const { current, previous } = demoSeries(period);
  return { current: totalsOf(current), previous: previous.length ? totalsOf(previous) : null };
}

/** Requests by weekday (Mon first) and hour (UTC), as a grid. */
export function demoHeatmap(): number[][] {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const cell of WEEKDAY_HOURS) grid[cell.weekday][cell.hour] = cell.requests;
  return grid;
}
