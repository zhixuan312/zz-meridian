// A shipped helper, not a test: vitest does not collect it.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * Whether the product still holds the template's sample — its generated company, its records, its demo people.
 *
 * A project created from the template keeps the sample as its own files until the team replaces it with its own data; a
 * project that has replaced it has none of `src/system/fixtures/`. The shipped tests that pin the sample's own figures
 * are then not applicable: they would fail on absent modules, which says nothing about the product. A test that holds a
 * rule over the product's own subjects — a table, a chart, a contract — must not skip with it, so only the files whose
 * every case reads the sample take this guard, and it is never a way to keep a broken test green.
 */
export const hasSample = (): boolean => fs.existsSync(path.join(ROOT, 'src/system/fixtures/sample.ts'));

/** A case's name with the reason it did not run, for a suite that skips the sample's own subjects. */
export const sampleAbsent = 'the sample is absent from this product';
