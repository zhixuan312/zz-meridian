/**
 * What `pnpm verify` needs to know about this project that it cannot discover from `app/`. Edit it; verify reads it.
 */
import { refusal } from '../src/app.config.ts';

type DeviceBudget = { desktop: number; phone: number };
type ReadinessBudget = { shellMs: DeviceBudget; dataMs: DeviceBudget; interactiveMs: DeviceBudget };
/** What "this route is ready" means, and one harmless control to press on it. */
type NavigationCheck = {
  /**
   * The rail route this describes. A rail route that redirects to a page under it (`/things` to `/things/<slug>`) is
   * followed there, and `title`, `readySelector` and the control are the page it lands on's.
   */
  path: string;
  /** Text the page's heading shows as soon as the shell has arrived. */
  title: string;
  /** The element that appears only when the page's data has, and (optionally) the text it must hold. */
  readySelector: string;
  readyText?: string;
  /** What pressing the control does: open a dialog, filter or sort the data, flip a toggle, or follow a link. */
  probe: 'dialog' | 'filter' | 'sort' | 'toggle' | 'link';
  /** A control that opens, sorts, filters, toggles or follows and never writes. Name it by role or aria, not by class. */
  controlSelector: string;
  /** What changes when the control works. */
  resultSelector: string;
  /**
   * Where this route's own reading is over the shared budget: its own figure for that metric and that device, with the
   * measurement that earned it beside it. Nothing it does not name moves, and leaving it out holds the route to
   * `budgets.navigation` like every other.
   */
  budget?: Partial<{ [K in keyof ReadinessBudget]: Partial<DeviceBudget> }>;
};

/** One way `pnpm verify --as` signs the browser in: the cookie that names the person, and what that person is expected to see. */
type Persona = {
  /** The cookie every browser suite carries, set before the first request; its value is the sample member's id. */
  cookie: { name: string; value: string };
  /** The rail routes this person may open, written by hand and never derived from the rail or the policy under test. */
  expectedRoutes: readonly string[];
  /** For each route this person may NOT open: one protected string that must not appear on the page that refuses them. */
  deniedProbe?: Record<string, string>;
  /**
   * The routes whose controls change with who is signed in, each pressed at 1440px as this person: the ones of
   * `expectedRoutes` it names. Left out, every expected route is pressed.
   */
  pressRoutes?: readonly string[];
};

type VerifyConfig = {
  /**
   * Detail pages checked beside every static route, one per state worth seeing (a normal record, a failed one).
   * `pnpm verify --full` checks them with every static route. One that answers an error or draws the not-found screen
   * fails, since what was measured is that screen and not the record.
   */
  detailRoutes: string[];
  /**
   * Addresses meant to be missing: a record that does not exist, under each detail route. Each is checked like a detail
   * route and must be the not-found screen: it answers 404 or draws `[data-missing-page]` (a record page in a streamed
   * shell has answered 200 by the time it knows). The address no page claims (`/this-page-does-not-exist`) is one already.
   * A route listed here that renders a page fails, so a record that came to exist is noticed.
   */
  missingRoutes?: string[];
  /**
   * For a product whose pages read and write a live API. verify presses every control it finds, Approve, Revoke and
   * Delete included, so those presses must reach a fake, never production. `script` starts a server on `--port 0` that
   * answers every route the pages call (writes answer success and are forgotten) and prints `listening on <url>`; verify
   * starts it first and builds and serves the app with the environment variable `env` set to that URL. Leave it out only
   * when the pages read nothing but local data, as this sample does.
   */
  fakeApi?: { script: string; env: string };
  /**
   * In a project that adopted Meridian (zz-meridian adopt), verify refuses to run until it knows its presses cannot
   * reach a live backend: name a `fakeApi`, or set this to true when the pages read and write nothing outside this
   * repository (local files, fixtures). Never set it to make verify run against an API.
   */
  noLiveApi?: true;
  /**
   * Environment variables naming a data store, besides `DATABASE_URL`, which verify always reads.
   *
   * verify refuses to start when one of them — from the environment, or from an `.env` file Next would load — resolves
   * to a host that is not this machine. It presses every control it finds, Delete included, and a `next build` and
   * `next start` in this folder read the project's own `.env`: an adopted app whose `DATABASE_URL` points at
   * production would otherwise have those presses land on production.
   */
  dataUrls?: string[];
  /**
   * Run verify against a remote data URL anyway. Set it only when you know what the presses reach.
   */
  allowRemoteData?: true;
  /**
   * The product's own browser checks, beside Meridian's audit, presses and keyboard walk: scripts verify runs with
   * `--base <url>` against the built app, failing when one exits non-zero. An entry is the script's path, for a check that
   * opens one browser, or `{ script, browsers }` for one that opens more at once. Verify holds that many of the run's
   * browsers (`--browsers`), the whole ceiling at most, while it runs, and tells it in `VERIFY_BROWSERS` how many that
   * is: a check that pools browsers sizes its pool from it, not from the machine.
   */
  browserChecks?: (string | { script: string; browsers: number })[];
  /**
   * The product's own browser checks that judge a time, run by `pnpm verify --timed` alone and one at a time, after the
   * live data and before Web Vitals, each with `--base <url>` like `browserChecks`. A check that judges a time under the
   * load of `--full` judges the load; move it here, and keep in `browserChecks` the half that judges no time.
   */
  timedChecks?: string[];
  /**
   * Questions the fake model answers with a call to one of the product's own tools, so a journey can check what the
   * assistant cites. `when` is a case-insensitive regular expression's source, matched against the user's message before
   * the fake model's own branches; the model then calls `tool` with `input` when the request hands that tool, and answers
   * with the tool's result. verify hands the steps to the fake model on its command line.
   */
  fakeModel?: { when: string; tool: string; input: Record<string, unknown> }[];
  /**
   * Routes that cannot be prerendered, each with the reason. `node scripts/route-policy.ts`, which verify runs after its
   * production build, fails any non-API route that is neither static nor partial unless it is named here. A route that
   * reads the signed-in user on every request is the usual one; move that read behind a boundary first, so the rest of
   * the page can prerender.
   */
  requestDependentRoutes?: { path: string; reason: string }[];
  /**
   * Limits verify enforces. Leave a key out for Meridian's default: first-load JS 830 KiB per route and 5% growth over
   * `scripts/verify.baseline.json`, the warm, cold and after-live navigation times, and no prefetch on a closed phone drawer.
   * Every page's HTML, gzipped through the end of the streamed response, is held to `htmlGrowthPct` (5%) over its own
   * figure in the baseline's `html`; `htmlKb` adds an absolute cap in KiB, the same gzipped figure, for a page a project
   * wants pinned, and has no default. `firstLoadKb: null` holds first-load JS the same way: each route the baseline holds
   * to its own figure alone, with the default cap binding only a route the baseline does not hold yet.
   */
  budgets?: {
    navigation?: { warm?: ReadinessBudget; cold?: ReadinessBudget; afterLive?: ReadinessBudget };
    firstLoadKb?: number | null;
    firstLoadGrowthPct?: number;
    htmlGrowthPct?: number;
    htmlKb?: Record<string, number>;
    prefetchKb?: { desktop: number; phoneClosed: number };
  };
  /**
   * One check for every route in the rail (`nav` in src/app.config.ts). `--full`, `--timed` and `--perf` fail on a rail route that has
   * none; the default smoke reports its data and interaction as not configured. Probes never write.
   * Selectors resolve inside open shadow roots as well as the light DOM; a descendant combinator does not cross a shadow
   * boundary, so name an element inside a root with a selector written for that root. When `controlSelector` matches more than
   * one element the first visible one is pressed and a `note: <selector> matches <n> elements; the first visible one was used`
   * line is printed once. It is information, never a failure.
   */
  navigationChecks?: NavigationCheck[];
  /** The up to three rail routes the default smoke visits. Without it: the landing route and the next two rail routes. */
  smokeRoutes?: string[];
  /**
   * The people `pnpm verify --as <persona>` can sign the browser in as, by name. Each carries the cookie a suite sets
   * before its first request, the routes that person is expected to see (written by hand), and, for the routes that
   * person may not open, one protected string that must not appear on the page. Leave it out in a product whose sign-in
   * is not Meridian's demo policy: `--as` then names no persona and is refused.
   */
  personas?: Record<string, Persona>;
  /**
   * What a route a persona may not open is expected to draw: the product's `refusal`, read from src/app.config.ts where it
   * is declared, never written here. `explain` expects the no-access page (`[data-no-access]`), `absent` the missing page
   * (`[data-missing-page]`) and no no-access page; the `deniedProbe` strings must be absent under both. Left out, verify
   * expects `explain`.
   */
  refusal?: 'explain' | 'absent';
};

/** Every rail route, in the rail's own order: what a persona who may open all of them is expected to see. */
const EVERY_ROUTE = ['/', '/members', '/settings', '/system', '/system/start/start-a-dashboard', '/business', '/customers', '/usage', '/requests', '/engineering', '/services', '/operations-tickets', '/tests', '/releases', '/keys'] as const;

/** The sample's routes whose controls change with the person: a key, a ticket, a member and the workspace are each written by some roles only. */
const ROLE_ROUTES = ['/keys', '/operations-tickets', '/members', '/settings'];

const config: VerifyConfig = {
  // Ids from the sample (the requests of src/system/fixtures/sample.ts, the customers of company.ts); tests/sample.test.ts fails if one stops being what it says.
  detailRoutes: [
    '/requests/req_qmi1vbyi3uqt', // GET, 200: no request body, no model
    '/requests/req_jqwm3le188pi', // POST /v1/messages, 201: model, tokens and a streamed response
    '/requests/req_p2r91aiimd17', // a request that answered 404: the refused state
    '/customers/northwind-labs', // an active customer: the largest, with a plan, requests and a 14-day trend
    '/customers/lumen-studio', // the past-due customer: the one whose payment has failed
  ],
  missingRoutes: [
    '/requests/req_missing', // no such request: the not-found screen in the shell
    '/customers/missing', // no customer has this id: the not-found screen in the shell
  ],
  smokeRoutes: ['/', '/requests', '/settings'],
  // The sample's own journeys across its three workspaces, run beside the audit, the presses and the keyboard walk; three
  // people at once, so three browsers.
  browserChecks: [{ script: 'journeys/workspaces.ts', browsers: 3 }],
  navigationChecks: [
    { path: '/', title: 'Home', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main [role="radio"][aria-checked="false"]', resultSelector: 'main [role="radio"]' },
    { path: '/members', title: 'Members', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main button[aria-haspopup="menu"]', resultSelector: '[role="menu"]' },
    { path: '/settings', title: 'Settings', readySelector: 'main [role="radio"]', probe: 'toggle', controlSelector: 'main [role="radio"][aria-checked="false"]', resultSelector: 'main [role="radio"]' },
    { path: '/system', title: 'One dashboard', readySelector: 'section[aria-label="The system in numbers"]', probe: 'link', controlSelector: 'section a[href^="/system/"]', resultSelector: 'h1' },
    { path: '/system/start/start-a-dashboard', title: 'Start a dashboard', readySelector: 'article h2', probe: 'link', controlSelector: 'nav[aria-label="Next and previous"] a', resultSelector: 'h1' },
    { path: '/business', title: 'Revenue', readySelector: 'main', readyText: 'Past due', probe: 'link', controlSelector: 'main a[href="/customers"]', resultSelector: 'h1' },
    { path: '/usage', title: 'Usage', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main [role="radio"][aria-checked="false"]', resultSelector: 'main [role="radio"]' },
    { path: '/customers', title: 'Customers', readySelector: 'main table tbody tr', probe: 'filter', controlSelector: 'main input[type="search"]', resultSelector: 'main table tbody tr' },
    { path: '/requests', title: 'Requests', readySelector: 'main table tbody tr', probe: 'filter', controlSelector: 'main input[type="search"]', resultSelector: 'main table tbody tr' },
    // Now's first part links to every service by how many there are ("All 6 services"): the one link to Services it has.
    { path: '/engineering', title: 'Now', readySelector: 'main', readyText: 'Services, now', probe: 'link', controlSelector: 'main a[href="/services"]', resultSelector: 'h1' },
    // Services has no button of its own. Its data has arrived when its first part has, "Each service, 90 days", which only
    // the body draws (the heading's sentence also says "uptime"); its control is a service's strip of days in that part,
    // which reads a day when it is pointed at.
    { path: '/services', title: 'Services', readySelector: 'main', readyText: 'Each service, 90 days', probe: 'toggle', controlSelector: 'main figure [role="group"]', resultSelector: 'main figure [aria-live="polite"]' },
    { path: '/keys', title: 'API keys', readySelector: 'main table tbody tr', probe: 'dialog', controlSelector: 'main button[aria-haspopup="dialog"]', resultSelector: '[role="dialog"]' },
    { path: '/operations-tickets', title: 'Tickets', readySelector: 'main table tbody tr', probe: 'dialog', controlSelector: 'main button[aria-haspopup="dialog"]', resultSelector: '[role="dialog"]' },
    { path: '/tests', title: 'Tests', readySelector: 'main table tbody tr', probe: 'filter', controlSelector: 'main input[type="search"]', resultSelector: 'main table tbody tr' },
    { path: '/releases', title: 'Releases', readySelector: 'main table tbody tr', probe: 'filter', controlSelector: 'main input[type="search"]', resultSelector: 'main table tbody tr' },
  ],
  // The sample's five frozen personas, the member ids of src/system/fixtures/sample-members.ts. The four with a full
  // role differ in what they may DO, not in what they may see; the Viewer is the one denied a route, so it is the one
  // that carries deniedProbe: a key name on Keys and a member's address on Members must not reach a Viewer's page.
  personas: {
    owner: { cookie: { name: 'zz_meridian_view_as', value: 'members_1' }, expectedRoutes: EVERY_ROUTE, pressRoutes: ROLE_ROUTES },
    admin: { cookie: { name: 'zz_meridian_view_as', value: 'members_2' }, expectedRoutes: EVERY_ROUTE, pressRoutes: ROLE_ROUTES },
    member: { cookie: { name: 'zz_meridian_view_as', value: 'members_4' }, expectedRoutes: EVERY_ROUTE, pressRoutes: ROLE_ROUTES },
    'key-manager': { cookie: { name: 'zz_meridian_view_as', value: 'members_5' }, expectedRoutes: EVERY_ROUTE, pressRoutes: ROLE_ROUTES },
    viewer: {
      cookie: { name: 'zz_meridian_view_as', value: 'members_12' },
      expectedRoutes: ['/', '/settings', '/system', '/system/start/start-a-dashboard', '/business', '/customers', '/usage', '/requests', '/engineering', '/services', '/operations-tickets', '/tests', '/releases'],
      deniedProbe: { '/keys': 'Load test, October', '/members': 'maya.chen@' },
      pressRoutes: ROLE_ROUTES,
    },
  },
  refusal,
};

export default config;
