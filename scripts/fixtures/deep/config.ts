/** The mappings for the navigation fixtures, in the shape of the template's `navigationChecks`. */
const config = {
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
