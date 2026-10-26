/**
 * The mappings for perf's after-live case: two live pages that listen for online events only once they have hydrated, on a
 * rail of their own. Budgets as wide as config.ts's, since the case is about whether the journey has a start, not its speed.
 */
const LOOSE = { desktop: 30_000, phone: 30_000 };
const config = {
  budgets: { navigation: { warm: { shellMs: LOOSE, dataMs: LOOSE, interactiveMs: LOOSE }, cold: { shellMs: LOOSE, dataMs: LOOSE, interactiveMs: LOOSE }, afterLive: { shellMs: LOOSE, dataMs: LOOSE, interactiveMs: LOOSE } } },
  navigationChecks: [
    { path: '/live-late-a', title: 'Live A', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main button#toggle', resultSelector: 'main button#toggle' },
    { path: '/live-late-b', title: 'Live B', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main button#toggle', resultSelector: 'main button#toggle' },
  ],
};

export default config;
