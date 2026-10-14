/**
 * The rules behind the facts a page states, worked out by code so a card, a page's title and an agent's context all
 * say the same thing. Pure: a rule reads nothing and imports no data and no React. It takes plain values and returns
 * what is true of them.
 *
 * A rule that states a fact writes the fact's one line itself, with the product's formatters, so the line is written
 * once: a page draws it and the page's context shares it. Each returns its fact when the rule holds and null when it
 * does not, and none has a weaker thing to say in its place. A line is a figure and what it counts, never a judgement
 * of it. What a rule needs of the product (the history a record asks for, the thresholds of a first) is an argument:
 * the readers pass `facts` from `src/app.config.ts`.
 */
import { ordinal, plural } from '@/lib/format';
import { formatDate } from '@/lib/format-date';

type FactKind = 'record' | 'first' | 'run' | 'steady' | 'all' | 'total';
/** One fact a rule found: its kind, its one line, where a person can see it for themselves, and the day it is about. */
export type Fact = { kind: FactKind; text: string; evidence?: string; day?: string };

/** One day's figure. */
type DayValue = { date: string; value: number };

/**
 * A page's figure a whole period at a time: the sum of each whole window of `length` values, counted back from the
 * latest, oldest first. A window short of the length is left out, so every value `record` is handed covers as many days.
 */
export function periods(values: readonly number[], length: number): number[] {
  const sums: number[] = [];
  for (let end = values.length; length > 0 && end - length >= 0; end -= length) {
    let sum = 0;
    for (let i = end - length; i < end; i++) sum += values[i];
    sums.unshift(sum);
  }
  return sums;
}

/**
 * The rule of a record: the latest period is higher than every one before it. `values` is one figure a whole period,
 * oldest first. A period may be called a record only when it and the periods before it number at least `needs`: with
 * less history the highest yet says little. `run` counts the periods in a row, ending with the latest, that were each a
 * record; a period that only equals the highest is not one.
 */
export function record(values: readonly number[], { needs, what, format }: { needs: number; what: string; format: (n: number) => string }): (Fact & { run: number }) | null {
  let highest = -Infinity, run = 0;
  values.forEach((value, i) => {
    run = i + 1 >= needs && value > highest ? run + 1 : 0;
    highest = Math.max(highest, value);
  });
  if (!run) return null;
  return { kind: 'record', run, text: `The highest ${what} yet: ${format(values[values.length - 1])}${run > 1 ? `, the ${ordinal(run)} record in a row` : ''}` };
}

/**
 * The rule of a first: the first day a threshold was passed, and how many days have passed it since. `days` is one
 * figure a day, oldest first. Of the thresholds, the fact is about the largest some day is above. It is nothing when no
 * threshold has been passed, and nothing when the earliest day is not below that threshold: a threshold already passed
 * when the records begin has no first day the product can know. `daysSince` counts the later days above it, not the
 * days gone by.
 */
export function first(days: readonly DayValue[], { thresholds, what, format }: { thresholds: readonly number[]; what: string; format: (n: number) => string }): (Fact & { threshold: number; day: string; daysSince: number }) | null {
  const passed = thresholds.filter((t) => days.some((d) => d.value > t));
  if (!passed.length) return null;
  const threshold = Math.max(...passed);
  if (!(days[0].value < threshold)) return null;
  const at = days.findIndex((d) => d.value > threshold);
  const daysSince = days.slice(at + 1).filter((d) => d.value > threshold).length;
  const day = days[at].date;
  return { kind: 'first', threshold, day, daysSince, text: `${what} first passed ${format(threshold)} in a day on ${formatDate(day)}${daysSince ? `; ${daysSince} ${plural(daysSince, 'day has', 'days have')} passed it since` : ''}` };
}

/**
 * The rule of an "all": every member of a set did the same thing, written N of N. `sets` is the sets to try, in order:
 * the whole set first, with an empty label, then each named subset. The fact is the first set that has a member and
 * whose every member did it; one member short and it is not a fact. `say.what` names the members and `say.did` what
 * they did.
 */
export function all<T>(sets: readonly { label: string; members: readonly T[] }[], did: (member: T) => boolean, say: { what: string; did: string }): (Fact & { count: number; label: string }) | null {
  const set = sets.find((s) => s.members.length > 0 && s.members.every(did));
  if (!set) return null;
  const count = set.members.length;
  return { kind: 'all', count, label: set.label, text: [`${count} of ${count}`, set.label, say.what, say.did].filter(Boolean).join(' ') };
}

/**
 * The rule of a total: the sum of everything recorded, with its first day and its latest. `days` is one figure a day,
 * oldest first. `format` writes the sum; hand it one that keeps every digit wherever the page has room for them.
 */
export function total(days: readonly DayValue[], { what, format }: { what: string; format: (n: number) => string }): (Fact & { sum: number }) | null {
  if (!days.length) return null;
  const sum = days.reduce((s, d) => s + d.value, 0);
  return { kind: 'total', sum, text: `${format(sum)} ${what} in ${days.length} ${plural(days.length, 'day')}, from ${formatDate(days[0].date)} to ${formatDate(days[days.length - 1].date)}` };
}

/**
 * The rule of a run: how long a state has held, up to today. `days` is one state a day, oldest first, the last of them
 * today; `good` is the state that counts.
 *
 * - `length`: the days in a row that end today and were `good`, today included; 0 when today is not.
 * - `reachesStart`: the run goes back to the earliest day given. What came before is not known, so the run is at least
 *   this long, and nobody may call it the longest.
 * - `longest`: no run among the days given is longer. A run an earlier one only equals still is.
 */
export function runOf<S>(days: readonly S[], good: S) {
  let length = 0;
  while (length < days.length && days[days.length - 1 - length] === good) length++;
  // Every run before this one ends at a day that was not good, so the days ahead of the run are counted on their own.
  let longer = false;
  for (let i = 0, held = 0; i < days.length - length && !longer; i++) {
    held = days[i] === good ? held + 1 : 0;
    longer = held > length;
  }
  return { length, reachesStart: length > 0 && length === days.length, longest: length > 0 && !longer };
}
