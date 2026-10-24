/**
 * This repository's own rules, beside Meridian's.
 *
 * `scripts/check.ts` reads one declaration from this file and nothing else, as text: it never imports the module.
 * `fourLayers` turns on the six four-layer rules — `src/data` imports neither `src/logic` nor `src/views`, `src/logic`
 * imports no view, every file under `src/views` is a renderer, what is drawn takes no value from `@/data` but the five
 * vocabulary modules, no page, view, logic or lib module calls `.query(`, and a `'use client'` module imports no logic
 * module whose imports reach a read. A project that has not adopted them leaves this file out, or assigns `false`.
 *
 * The gate runs this file as a step of its own when it exists (`scripts/gate.ts`). Add the project's own checks below;
 * they run there, never inside `scripts/check.ts`.
 */
export const fourLayers = true;
