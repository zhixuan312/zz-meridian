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
    // The control is inside an open root of a hydrated page; React never marks the inside of a root.
    { path: '/nav-root-hydrated', title: 'Hydrated root', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'button.root-toggle', resultSelector: 'button.root-toggle' },
    // Two elements match: the first is hidden.
    { path: '/nav-multi', title: 'Several matches', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'button.pick', resultSelector: 'button.pick' },
    // The only destination of its workspace, reached through the workspace menu (issue #31).
    { path: '/nav-solo', title: 'Solo', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main button#toggle', resultSelector: 'main button#toggle' },
    // The same, in a workspace the menu does not offer.
    { path: '/nav-solo-unoffered', title: 'Unoffered', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main button#toggle', resultSelector: 'main button#toggle' },
    // The control is there and pressable, and pressing it changes nothing.
    { path: '/nav-dead-control', title: 'Dead control', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main button#toggle', resultSelector: 'main button#toggle' },
    // A rail route that redirects to a page under it: the journey follows it there (#97).
    { path: '/nav-redirect', title: 'Thing A', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main button#toggle', resultSelector: 'main button#toggle' },
    // A list with no rows yet, and the same list failed: a row-link probe has nothing to press on either (#97).
    { path: '/nav-empty', title: 'Empty list', readySelector: 'main table tbody tr', probe: 'link', controlSelector: 'main a[href^="/things/"]', resultSelector: 'h1' },
    { path: '/nav-empty-error', title: 'Empty list', readySelector: 'main table tbody tr', probe: 'link', controlSelector: 'main a[href^="/things/"]', resultSelector: 'h1' },
    // The link is pressable at once and the ready text comes 800 ms later: the link is pressed once the data is measured.
    { path: '/nav-link-late', title: 'Late data', readySelector: 'main', readyText: 'Loaded', probe: 'link', controlSelector: 'main a[href="/nav-home"]', resultSelector: 'h1' },
  ],
};

export default config;
