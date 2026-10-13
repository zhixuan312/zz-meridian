/**
 * The rules behind the facts a page states, worked out by code so a card, a page's title and an agent's context all
 * say the same thing. Pure: a rule reads nothing and imports no data and no React. It takes plain values and returns
 * what is true of them.
 */

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
