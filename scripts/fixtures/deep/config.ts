/** The mappings for the navigation fixtures, in the shape of the template's `navigationChecks`. */
// These cases are about which element a selector resolves to, never about speed, so their budgets are wide enough that
// a loaded machine's timings cannot decide them (a phone shell at 488 ms once failed /nav-multi on a busy runner).
const LOOSE = { desktop: 30_000, phone: 30_000 };
const config = {
  budgets: { navigation: { warm: { shellMs: LOOSE, dataMs: LOOSE, interactiveMs: LOOSE }, cold: { shellMs: LOOSE, dataMs: LOOSE, interactiveMs: LOOSE } } },
  navigationChecks: [
    { path: '/nav-home', title: 'Home', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main button#toggle', resultSelector: 'main button#toggle' },
    // The control and its result are inside an open shadow root.
    { path: '/nav-root-target', title: 'Root target', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'button.root-toggle', resultSelector: 'button.root-toggle' },
    // The page has no such control.
    { path: '/nav-missing-target', title: 'Missing target', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'button.not-there', resultSelector: 'button.not-there' },
    // Two elements match: the first is hidden.
    { path: '/nav-multi', title: 'Several matches', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'button.pick', resultSelector: 'button.pick' },
  ],
};

export default config;
