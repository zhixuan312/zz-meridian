// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { answerProblem } from '../scripts/lib/answered.ts';

// A route's answer is part of what a suite measured: a missing or error page has a heading, a main and controls like any
// other, so the answer is judged before the page's own rules.
describe("a route's answer", () => {
  it('fails a route no document arrived for, instead of measuring Chrome\'s error page as the route', () => {
    expect(answerProblem('/requests', 0, false, [])).toMatch(/answered no document \(status 0\)/);
    expect(answerProblem('/requests', 0, true, [])).toMatch(/answered no document/);
  });
  it('passes a route that answered below 400 and draws no not-found screen', () => {
    expect(answerProblem('/requests', 200, false, [])).toBeNull();
    expect(answerProblem('/requests', 304, false, [])).toBeNull();
  });
  it('fails an error page, and a page that draws the not-found screen without being declared missing', () => {
    expect(answerProblem('/requests', 500, false, [])).toMatch(/answered 500/);
    expect(answerProblem('/requests', 200, true, [])).toMatch(/draws the not-found screen/);
  });
  it('passes a declared missing route that answers 404 or draws the not-found screen', () => {
    expect(answerProblem('/gone', 404, false, ['/gone'])).toBeNull();
    expect(answerProblem('/gone', 200, true, ['/gone'])).toBeNull();
    expect(answerProblem('/gone', 200, false, ['/gone'])).toMatch(/is in missingRoutes/);
  });
});
