// @vitest-environment node
// The audit prints findings of two kinds, and the tiers rule sorts them: content a person cannot see or reach at all, and
// an element a person cannot use, is Tier 1 and fails the run; something there and working that is awkward or that looks
// wrong — a small target, low contrast, a line cut but still visible — is Tier 2 and is reported. The sort lives in one
// function so the audit, the browser run and the closing line cannot each decide it differently.
import { describe, expect, it } from 'vitest';
import { auditFindings, countsOf, kindOf, partition, tierOf } from '../scripts/lib/audit-findings.ts';

describe('what a finding is worth', () => {
  it('reports a small touch target and low contrast, the rule naming both', () => {
    expect(tierOf('touch target under 44px: Close 24×24')).toBe(2);
    expect(tierOf('contrast: 3.21:1 a[href] "Open"')).toBe(2);
  });

  it('reports text that is cut but still visible, which the rule calls the look', () => {
    // "a truncated line, an ellipsis, a clipped edge" are Tier 2 in as many words.
    expect(tierOf('clipped: span "Revenue for the quarter"')).toBe(2);
    expect(tierOf('truncated: td "Total revenue" is cut with an ellipsis and no title holds the whole of it')).toBe(2);
    // Drawn past a box that does not clip it: not cut at all, and still on the page.
    expect(tierOf('spills: span "Revenue" spills its box by 6px')).toBe(2);
  });

  it('reports the awkward things beside them: a heading hole, a card that scrolls, a page that scrolls sideways', () => {
    expect(tierOf('heading skips a level: h2 then h4')).toBe(2);
    expect(tierOf('scrollers: card-a, card-b')).toBe(2);
    expect(tierOf('sideways: document 1042px wide at 768')).toBe(2);
    expect(tierOf('sideways: strip .tabs 900 > 390')).toBe(2);
    expect(tierOf('sideways: data page 600px wide in a 900px canvas (it should fill it)')).toBe(2);
    expect(tierOf('a table head draws 24px on a phone: Requests')).toBe(2);
  });

  it('fails the run for content that cannot be seen or reached at all', () => {
    // A table wider than its frame: the last columns have no scroller and nothing to scroll.
    expect(tierOf('sideways: table Requests 1042 > its frame 768 (hideBelow a column)')).toBe(1);
    expect(tierOf('the page holds 0 characters of text — it rendered nothing, or only its loading state')).toBe(1);
    expect(tierOf('unmeasured: x-card (no open shadow root)')).toBe(1);
    expect(tierOf('/keys answered 404, so what was measured is its error page and not the route')).toBe(1);
  });

  it('fails the run for an element a person cannot use, by pointer, keyboard or screen reader', () => {
    for (const f of [
      'unnamed: button',
      'no focus ring: button "Save"',
      'focus lands on a control that draws nothing: Save',
      'overlap: span "a" and span "b" are drawn in the same place',
      'overlap: a line (svg) is drawn through span "Revenue"',
    ]) expect(tierOf(f), f).toBe(1);
  });

  it('fails the run for a finding it does not recognise, so a new one is never reported by default', () => {
    expect(tierOf('something the audit started printing yesterday')).toBe(1);
    expect(kindOf('something the audit started printing yesterday')).toBeNull();
  });
});

describe('the split the audit prints', () => {
  it('keeps every finding, in the order the page produced them', () => {
    const all = ['contrast: 3.1:1 a "x"', 'overlap: span "y" and span "z"', 'touch target under 44px: Close 24×24'];
    const { blocking, reported } = partition(all);
    expect(blocking).toEqual(['overlap: span "y" and span "z"']);
    expect(reported).toEqual(['contrast: 3.1:1 a "x"', 'touch target under 44px: Close 24×24']);
  });

  it('counts the reported kinds, and names the ones that were found', () => {
    const counts = countsOf(['contrast: 3.1:1 a "x"', 'contrast: 3.4:1 b "y"', 'touch target under 44px: Close 24×24', 'overlap: span "y" and span "z"']);
    expect(counts).toEqual({ contrast: 2, 'touch target': 1 });
  });
});

describe('what the browser run reads from the audit', () => {
  it('turns the audit\'s own line into what the closing line says', () => {
    expect(auditFindings('audit: {"blocking":0,"reported":{"contrast":12,"touch target":3}}')).toEqual(['12 contrast', '3 touch target']);
  });

  it('names nothing when the audit found nothing, and reads no other line', () => {
    expect(auditFindings('audit: {"blocking":0,"reported":{}}')).toEqual([]);
    expect(auditFindings('audit: 0 issues across 12 routes and 2 embeds, in dark and light')).toEqual([]);
    expect(auditFindings('')).toEqual([]);
  });

  it('still reports what it found when the run is red, so neither is hidden behind the other', () => {
    expect(auditFindings('audit: {"blocking":2,"reported":{"contrast":12}}')).toEqual(['12 contrast']);
  });
});
