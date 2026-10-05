/** The mappings for the readiness fixtures, in the shape of the template's `navigationChecks`. */
const config = {
  navigationChecks: [
    { path: '/', title: 'Home', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main button[aria-pressed]', resultSelector: 'main button[aria-pressed]' },
    { path: '/slow-data', title: 'Slow data', readySelector: 'main table tbody tr', probe: 'toggle', controlSelector: 'main button[aria-pressed]', resultSelector: 'main button[aria-pressed]' },
    { path: '/dead-control', title: 'Dead control', readySelector: 'main table tbody tr', probe: 'sort', controlSelector: 'main button#sort', resultSelector: 'main table thead th' },
  ],
};

export default config;
