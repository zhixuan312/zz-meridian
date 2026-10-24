/**
 * This repository's own rules, beside Meridian's.
 *
 * `scripts/check.ts` reads one declaration from this file and nothing else, as text: it never imports the module.
 * `fourLayers` turns on the three four-layer rules — `src/data` imports neither `src/logic` nor `src/views`,
 * `src/logic` imports no view, and every file under `src/views` is a renderer. A project that has not adopted them
 * leaves this file out, or assigns `false`.
 *
 * The gate runs this file as a step of its own when it exists (`scripts/gate.ts`). Add the project's own checks below;
 * they run there, never inside `scripts/check.ts`.
 */
export const fourLayers = true;
