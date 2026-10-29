/**
 * How what a page states at its head reaches its shared context (decision 0011). A page's title is a sentence worked
 * out from its figures, and a fact is one line a rule found (`src/lib/facts.ts`). Both are worked out on the server,
 * from the history only the server reads, and handed on as sentences: the page draws them and the context leads with
 * them, so a person and an agent are told the same thing in the same words.
 */
import { changeOf, formatPercent, plural } from '@/lib/format';
import type { Service } from '@/components/patterns/status-list';
import type { Fact } from '@/lib/facts';
import type { Insight } from '@/lib/shared-context';

/**
 * What a page states at its head: its title and the facts its rules found. `title` is null when it could not be worked
 * out, and the page is then headed by its name; `unknown` says why, for the context.
 */
export type PageHead = { title: string | null; facts: Fact[]; unknown?: string };

/** What a context says when the days a title and a record are worked out from could not be read. */
export const HISTORY_UNREAD = 'The history could not be read, so this page is headed by its name and states no record, first or total.';

/** What a context says when parts of its data could not be read: each named, and what they state is missing, not zero. */
export function unreadNote(unread: readonly string[]): string {
  const names = unread.length === 1 ? unread[0] : `${unread.slice(0, -1).join(', ')} and ${unread.at(-1)}`;
  const note = `${names} could not be read, so what ${unread.length === 1 ? 'it states' : 'they state'} is missing, not zero.`;
  return `${note[0].toUpperCase()}${note.slice(1)}`;
}

/** A rule's fact as a context's insight: the kind's name, then the rule's own line, with where a person can see it. */
export const factInsight = (fact: Fact): Insight => ({ text: `${fact.kind[0].toUpperCase()}${fact.kind.slice(1)}: ${fact.text}.`, evidence: fact.evidence });

/** A rule's fact as a page is handed it: its kind, its line, its day and where a person can see it, without the figures the rule returned beside them. */
export const handed = ({ kind, text, day }: Fact, evidence?: string): Fact => ({ kind, text, ...(day ? { day } : {}), ...(evidence ? { evidence } : {}) });

/** What a context leads its insights with: the page's title as the page draws it, then each fact. */
export const headInsights = ({ title, facts }: PageHead): Insight[] => [...(title ? [{ text: title }] : []), ...facts.map(factInsight)];

/** A service as a title reads it: its name and its state now. */
export type ServiceNow = Pick<Service, 'name' | 'status'>;
/** A state that is wrong, as a title says it. */
export const STATE = { degraded: 'degraded', outage: 'down' } as const;
/** The services in the worst state any is in, and that state; null when every one is operational. */
export function worst(services: readonly ServiceNow[]): { names: string[]; state: keyof typeof STATE } | null {
  for (const state of ['outage', 'degraded'] as const) {
    const names = services.filter((s) => s.status === state).map((s) => s.name);
    if (names.length) return { names, state };
  }
  return null;
}

/** A period in words: "30 days". */
export const inDays = (days: number) => `${days} ${plural(days, 'day')}`;

/**
 * One figure against another as a title says it: the size of the change, one decimal and no sign, and which way it
 * went. Null when there is nothing to compare with, which a figure of zero is too; `level` when the change rounds to
 * 0.0%, so a title never says "0.0% more".
 */
export function against(now: number, before: number | null): { by: string; way: 'up' | 'down' | 'level' } | null {
  const change = changeOf(now, before);
  if (change === null) return null;
  const by = formatPercent(Math.abs(change), 1);
  // On the magnitude, as Delta judges flat: a change too small for its decimal prints "<0.1%", which is still level.
  return { by, way: Math.abs(change) < 0.0005 ? 'level' : change > 0 ? 'up' : 'down' };
}
