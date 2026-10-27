/**
 * The same mappings as config.ts with every navigation budget at 1 ms: a time is over its budget whenever it is judged at all.
 * Three pages that have no case of their own under `--timing off` are mapped wrongly on purpose, so each of the three ways a
 * mapping can disagree with its page is a case of its own; config.ts maps them rightly, and passes them.
 */
import base from './config.ts';

const TIGHT = { desktop: 1, phone: 1 };
const ready = { shellMs: TIGHT, dataMs: TIGHT, interactiveMs: TIGHT };

const WRONG: Record<string, Record<string, string>> = {
  // The heading the mapping expects is not the page's.
  '/nav-root-hydrated': { title: 'Wrong heading' },
  // The rows are there and never show the text the mapping waits for.
  '/nav-root-target': { readyText: 'Never shown' },
  // The rows the mapping waits for are not on the page.
  '/nav-multi': { readySelector: 'main table tbody tr.absent' },
};

const config = { ...base, budgets: { navigation: { warm: ready, cold: ready } }, navigationChecks: base.navigationChecks.map((c) => ({ ...c, ...WRONG[c.path] })) };

export default config;
