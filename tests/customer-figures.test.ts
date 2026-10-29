// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatCost } from '@/lib/format';
import { CUSTOMERS } from '@/system/fixtures/company';
import { CUSTOMER_METRICS, customerFigures, customersContext, pastDueNote, under } from '@/logic/customers-context';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATE = { q: '', plan: 'all', status: 'all', sort: 'revenue', dir: 'desc', page: '1' };
const fact = (label: string) => customersContext(CUSTOMERS, under(CUSTOMERS, 'all'), STATE).facts.find((f) => f.label === label)?.value ?? '';

describe("the customers' figures", () => {
  it('are worked out in one place, from every customer that has not left', () => {
    const figures = customerFigures(CUSTOMERS);
    const kept = CUSTOMERS.filter((c) => c.status !== 'left');
    expect(kept.length).toBeLessThan(CUSTOMERS.length);
    expect(figures.customers).toBe(kept.length);
    expect(figures.revenue).toBeCloseTo(kept.reduce((a, c) => a + c.revenue, 0), 6);
    expect(figures.pastDue.map((c) => c.id)).toEqual(CUSTOMERS.filter((c) => c.status === 'past due').map((c) => c.id));
    expect(customerFigures([])).toEqual({ customers: 0, revenue: 0, pastDue: [] });
  });

  it('count a customer that has left in nothing, whatever its record still says', () => {
    const gone = { ...CUSTOMERS[0], status: 'left' as const };
    const [withIt, without] = [customerFigures([...CUSTOMERS.slice(1), gone]), customerFigures(CUSTOMERS.slice(1))];
    expect(withIt.customers).toBe(without.customers);
    expect(withIt.revenue).toBe(without.revenue);
  });

  it('leave a customer that has left out of the list and its count, and show it under its own status', () => {
    const left = CUSTOMERS.filter((c) => c.status === 'left');
    expect(under(CUSTOMERS, 'all')).toHaveLength(CUSTOMERS.length - left.length);
    expect(under(CUSTOMERS, 'left').map((c) => c.id)).toEqual(left.map((c) => c.id));
    expect(fact('Shown')).toMatch(new RegExp(`^${CUSTOMERS.length - left.length} of ${CUSTOMERS.length - left.length}, `));
    const gone = customersContext(CUSTOMERS, under(CUSTOMERS, 'left'), { ...STATE, status: 'left' });
    expect(gone.facts.find((f) => f.label === 'Matching')?.value).toMatch(new RegExp(`^${left.length} of ${left.length} that have left`));
    // The figures beside the list of those that left are still the figures of those that have not.
    expect(gone.facts.find((f) => f.label === CUSTOMER_METRICS.customers.label)?.value).toBe(String(CUSTOMERS.length - left.length));
  });

  it('name the customers far above the median error rate, and against a median of none only those with errors', () => {
    const insight = (rates: number[]) => {
      const rows = CUSTOMERS.filter((c) => c.status !== 'left').slice(0, rates.length).map((c, i) => ({ ...c, errorRate: rates[i] }));
      return customersContext(rows, rows, STATE).insights.find((i) => /error rate|errors/.test(i.text))?.text;
    };
    expect(insight([0, 0, 0, 0])).toBeUndefined();
    expect(insight([0, 0, 0, 0.02])).toMatch(/^1 of 4 has errors, where the median customer has none: .+ \(2\.00%\)\.$/);
    expect(insight([0.01, 0.01, 0.01, 0.05])).toMatch(/^1 of 4 has an error rate at least twice the median customer's 1\.00%: .+ \(5\.00%\)\.$/);
  });

  it('are what the assistant is told, under the labels the tiles carry', () => {
    const figures = customerFigures(CUSTOMERS);
    expect(fact(CUSTOMER_METRICS.customers.label)).toBe(String(figures.customers));
    expect(fact(CUSTOMER_METRICS.revenue.label)).toBe(formatCost(figures.revenue));
    expect(fact(CUSTOMER_METRICS.pastDue.label).startsWith(String(figures.pastDue.length))).toBe(true);
  });

  it('are what the page draws: it takes them from customerFigures and spells no total of its own', () => {
    const view = fs.readFileSync(path.join(ROOT, 'src/views/customers.tsx'), 'utf8');
    // A source check, and only that: it holds the view to calling the one function and to destructuring what it returns,
    // and to the two spellings a total of its own would most likely take. A second total through a helper would pass
    // it, which is why the case above compares the figures with what the context states.
    expect(view).toMatch(/const \{[^}]*\} = customerFigures\(/);
    expect(view).not.toMatch(/\.reduce\(\(a, c\) => a \+ c\.revenue/);
    expect(view).not.toMatch(/status === 'past due'/);
  });
});

describe('the order the Customers context lists them in', () => {
  it("is the table's: names by the collator, so a lower-case name sorts among the others", () => {
    const named = (name: string) => ({ ...CUSTOMERS[0]!, id: name, name });
    const rows = ['zeta labs', 'Acme', 'beta co', 'Delta'].map(named);
    const shown = customersContext(rows, rows, { ...STATE, sort: 'name', dir: 'asc' }).facts.find((f) => f.label === 'Shown')!.value;
    expect(shown.match(/(Acme|beta co|Delta|zeta labs) \(/g)).toEqual(['Acme (', 'beta co (', 'Delta (', 'zeta labs (']);
  });
});

describe("the past-due tile's line", () => {
  it('names the customers as a sentence does, the largest first, and counts the rest past two', () => {
    const owing = (name: string, revenue: number) => ({ name, revenue });
    expect(pastDueNote([])).toBe('Every invoice is paid');
    expect(pastDueNote([owing('Acme', 10)])).toBe('Acme');
    expect(pastDueNote([owing('Acme', 10), owing('Brightline', 20)])).toBe('Brightline and Acme');
    expect(pastDueNote([owing('Acme', 10), owing('Brightline', 20), owing('Cobalt', 5), owing('Dune', 1)])).toBe('Brightline, Acme and 2 more');
  });
});
