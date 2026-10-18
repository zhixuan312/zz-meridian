// @vitest-environment node
// A dropped frame on the runner is diagnosed from the log alone: the longest gap, and whether the main thread spent it
// (a long animation frame, split into script, style and layout, and render) or not (the compositor or the host).
import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

it('names what spent the longest gap', async () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'scripts/vitals.ts'), 'utf8');
  expect(source).toMatch(/long-animation-frame/);
  const { frameCause, loafOf } = await import('../scripts/lib/frame-cause.ts');
  // A frame of 80 ms from 100: style and layout from 170 (10 ms, plus 10 ms forced inside the script), render from 160.
  expect(loafOf({ startTime: 100, duration: 80, renderStart: 160, styleAndLayoutStart: 170, scripts: [{ invoker: 'BUTTON#open.onclick', duration: 52, forcedStyleAndLayoutDuration: 10 }] }))
    .toEqual({ duration: 80, script: 52, layout: 20, render: 10, invoker: 'BUTTON#open.onclick' });
  expect(frameCause(83, [{ duration: 80, script: 52, layout: 20, render: 8, invoker: 'BUTTON#open.onclick' }])).toBe('longest gap 83 ms: a long animation frame of 80 ms (script 52 ms by BUTTON#open.onclick, style and layout 20 ms, render 8 ms)');
  expect(frameCause(67, [])).toBe('longest gap 67 ms: no long animation frame (the main thread was not busy; the compositor or the host)');
});
