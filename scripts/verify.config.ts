/**
 * What `pnpm verify` needs to know about this project that it cannot discover from `app/`. Edit it; verify reads it.
 */
type DeviceBudget = { desktop: number; phone: number };
type ReadinessBudget = { shellMs: DeviceBudget; dataMs: DeviceBudget; interactiveMs: DeviceBudget };
/** What "this route is ready" means, and one harmless control to press on it. */
type NavigationCheck = {
  /** The rail route this describes. */
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
};

type VerifyConfig = {
  /**
   * Detail pages checked beside every static route, one per state worth seeing (a normal record, a failed one, a missing
   * one). `pnpm verify --full` checks them with every static route.
   */
  detailRoutes: string[];
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
   * `--base <url>` against the built app, failing when one exits non-zero.
   */
  browserChecks?: string[];
  /**
   * Routes that cannot be prerendered, each with the reason. `node scripts/route-policy.ts`, which verify runs after its
   * production build, fails any non-API route that is neither static nor partial unless it is named here. A route that
   * reads the signed-in user on every request is the usual one; move that read behind a boundary first, so the rest of
   * the page can prerender.
   */
  requestDependentRoutes?: { path: string; reason: string }[];
  /**
   * Limits verify enforces. Leave a key out for Meridian's default: first-load JS 820 KiB per route and 5% growth over
   * `scripts/verify.baseline.json`, the warm, cold and after-live navigation times, and no prefetch on a closed phone drawer.
   * `htmlKb` caps a route's uncompressed HTML, through the end of the streamed response; it has no default.
   */
  budgets?: {
    navigation?: { warm?: ReadinessBudget; cold?: ReadinessBudget; afterLive?: ReadinessBudget };
    firstLoadKb?: number;
    firstLoadGrowthPct?: number;
    htmlKb?: Record<string, number>;
    prefetchKb?: { desktop: number; phoneClosed: number };
  };
  /**
   * One check for every route in the rail (`nav` in src/app.config.ts). `--full` and `--perf` fail on a rail route that has
   * none; the default smoke reports its data and interaction as not configured. Probes never write.
   */
  navigationChecks?: NavigationCheck[];
  /** The up to three rail routes the default smoke visits. Without it: the landing route and the next two rail routes. */
  smokeRoutes?: string[];
};

const config: VerifyConfig = {
  // Ids from the sample (src/system/fixtures/sample.ts); tests/sample.test.ts fails if one stops being what it says.
  detailRoutes: [
    '/requests/req_qmi1vbyi3uqt', // GET, 200: no request body, no model
    '/requests/req_jqwm3le188pi', // POST /v1/messages, 201: model, tokens and a streamed response
    '/requests/req_p2r91aiimd17', // 404: the refused state
    '/requests/req_missing', // no such request: the not-found screen in the shell
  ],
  smokeRoutes: ['/', '/requests', '/settings'],
  budgets: { htmlKb: { '/health': 100, '/requests': 150 } },
  navigationChecks: [
    { path: '/', title: 'Overview', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main [role="radio"][aria-checked="false"]', resultSelector: 'main [role="radio"]' },
    { path: '/requests', title: 'Requests', readySelector: 'main table tbody tr', probe: 'filter', controlSelector: 'main input[type="search"]', resultSelector: 'main table tbody tr' },
    { path: '/analytics', title: 'Analytics', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main [role="radio"][aria-checked="false"]', resultSelector: 'main [role="radio"]' },
    { path: '/health', title: 'Health', readySelector: 'main', readyText: 'Uptime', probe: 'toggle', controlSelector: 'main button[aria-pressed]', resultSelector: 'main button[aria-pressed]' },
    { path: '/customers', title: 'Customers', readySelector: 'main table tbody tr', probe: 'filter', controlSelector: 'main input[type="search"]', resultSelector: 'main table tbody tr' },
    { path: '/keys', title: 'API keys', readySelector: 'main table tbody tr', probe: 'dialog', controlSelector: 'main button[aria-haspopup="dialog"]', resultSelector: '[role="dialog"]' },
    { path: '/members', title: 'Members', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main button[aria-haspopup="menu"]', resultSelector: '[role="menu"]' },
    { path: '/settings', title: 'Settings', readySelector: 'main [role="switch"]', probe: 'toggle', controlSelector: 'main [role="switch"]', resultSelector: 'main [role="switch"]' },
    { path: '/system', title: 'One dashboard', readySelector: 'section[aria-label="The system in numbers"]', probe: 'link', controlSelector: 'section a[href^="/system/"]', resultSelector: 'h1' },
    { path: '/system/start/start-a-dashboard', title: 'Start a dashboard', readySelector: 'article h2', probe: 'link', controlSelector: 'nav[aria-label="Next and previous"] a', resultSelector: 'h1' },
  ],
};

export default config;
