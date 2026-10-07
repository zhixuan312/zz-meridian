/**
 * API keys' shared context (decision 0011): which keys exist, who owns them, what they can call and which have gone
 * unused. A key's secret, and its hash, are never in it: the secret is shown once, on this page, and nowhere else.
 */
import type { ApiKey } from '@/data/sample';
import { formatDate } from '@/lib/format-date';
import { listed, type Insight, type SharedContext } from '@/lib/shared-context';

const DAY = 86_400_000;
/** Days unused after which a live key is worth a look: a forgotten key is a door left open. */
export const UNUSED_DAYS = 30;

export function keysContext(rows: ApiKey[], now: string, scopes: readonly string[]): SharedContext {
  const at = Date.parse(now);
  const unused = (k: ApiKey) => (k.lastUsed ? Math.floor((at - Date.parse(k.lastUsed)) / DAY) : null);
  const live = rows.filter((k) => k.env === 'live');
  const insights: Insight[] = [];
  const idle = live.filter((k) => (unused(k) ?? Infinity) >= UNUSED_DAYS);
  if (idle.length) insights.push({ text: `${idle.length} live ${idle.length === 1 ? 'key has' : 'keys have'} not been used for ${UNUSED_DAYS} days or more: ${idle.map((k) => `${k.name} (${k.lastUsed ? `${unused(k)} days` : 'never used'}, owner ${k.owner})`).join(', ')}.` });
  const broad = live.filter((k) => scopes.every((s) => k.scopes.includes(s)));
  if (broad.length) insights.push({ text: `${broad.map((k) => k.name).join(', ')} ${broad.length === 1 ? 'is a live key' : 'are live keys'} with every scope; a narrower key limits what a leak can reach.` });
  const owners = new Map<string, number>();
  for (const k of live) owners.set(k.owner, (owners.get(k.owner) ?? 0) + 1);
  const [owner, n] = [...owners].reduce((m, e) => (e[1] > m[1] ? e : m), ['', 0]);
  if (n > 1) insights.push({ text: `${owner} owns ${n} of the ${live.length} live keys.` });
  return {
    view: 'keys',
    title: 'API keys',
    address: '/keys',
    scope: 'every API key of this workspace, live and test',
    facts: [
      { label: 'Keys', value: `${rows.length}: ${live.length} live, ${rows.length - live.length} test` },
      { label: 'Every key', value: listed(rows, (k) => `${k.name} (${k.id}, ${k.env}, ${k.hint}, owner ${k.owner}, scopes ${k.scopes.join('/')}, created ${formatDate(k.created)}, ${k.lastUsed ? `last used ${unused(k) === 0 ? 'today' : `${unused(k)} days ago`}` : 'never used'})`, 'query_keys finds them'), definition: 'A scope is an API family the key may call. The hint is the key\'s first and last characters, never the secret.' },
    ],
    insights,
    unknowns: ['A key\'s secret is never shared with an agent: it is shown once, on this page, when the key is created. Creating a key is the person\'s to do here; revoking one can be proposed.'],
  };
}
