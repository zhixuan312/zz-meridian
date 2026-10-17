/** The same mappings as config.ts with every navigation budget at 1 ms: a time is over its budget whenever it is judged at all. */
import base from './config.ts';

const TIGHT = { desktop: 1, phone: 1 };
const ready = { shellMs: TIGHT, dataMs: TIGHT, interactiveMs: TIGHT };

const config = { ...base, budgets: { navigation: { warm: ready, cold: ready } } };

export default config;
