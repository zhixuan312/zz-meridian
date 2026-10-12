// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatCost } from '@/lib/format';
import { CUSTOMERS } from '@/system/fixtures/sample-records';
import { CUSTOMER_METRICS, customerFigures, customersContext } from '@/views/customers-context';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATE = { q: '', plan: 'all', status: 'all', sort: 'spend', dir: 'desc', page: '1' };
const fact = (label: string) => customersContext(CUSTOMERS, CUSTOMERS, STATE).facts.find((f) => f.label === label)?.value ?? '';

describe("the customers' figures", () => {
  it('are worked out in one place, from every customer', () => {
    const figures = customerFigures(CUSTOMERS);
    expect(figures.customers).toBe(CUSTOMERS.length);
    expect(figures.spend).toBeCloseTo(CUSTOMERS.reduce((a, c) => a + c.spend, 0), 6);
    expect(figures.pastDue.map((c) => c.id)).toEqual(CUSTOMERS.filter((c) => c.status === 'past due').map((c) => c.id));
    expect(customerFigures([])).toEqual({ customers: 0, spend: 0, pastDue: [] });
  });

  it('are what the assistant is told, under the labels the tiles carry', () => {
    const figures = customerFigures(CUSTOMERS);
    expect(fact(CUSTOMER_METRICS.customers.label)).toBe(String(figures.customers));
    expect(fact(CUSTOMER_METRICS.spend.label)).toBe(formatCost(figures.spend));
    expect(fact(CUSTOMER_METRICS.pastDue.label).startsWith(String(figures.pastDue.length))).toBe(true);
  });

  it('are what the page draws: the view asks for them and adds nothing up itself', () => {
    const view = fs.readFileSync(path.join(ROOT, 'src/views/customers.tsx'), 'utf8');
    expect(view).toMatch(/\bcustomerFigures\(/);
    expect(view).not.toMatch(/\.reduce\(\(a, c\) => a \+ c\.spend/);
    expect(view).not.toMatch(/status === 'past due'/);
  });
});
