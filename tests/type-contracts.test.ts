// @vitest-environment node
// Six cases assert only through `// @ts-expect-error`: a dialog must have a name, `formatRelative` must be told the
// clock, and four chart and proposal forms must refuse what they cannot draw. Nothing failed when those types widened —
// the directive becomes unused (TS2578), `tsc --noEmit` exits non-zero, and the type check is **Tier 3**, which reports
// and never fails a run. So the invariants those cases carry were enforced by nothing.
//
// The type check stays Tier 3, and that is why this test compiles only what those cases are about: a program rooted at
// the six files that carry the directives, keeping only the diagnostics that land in one of them. A widening in a
// subject fails this run; a type error anywhere else is still the type check's to report, and turns nothing red. The six
// subjects are imported below as well, so a change to any of them selects this test rather than leaving it out of a
// related run.
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createProgram, getPreEmitDiagnostics, parseJsonConfigFileContent, readConfigFile, sys, type Diagnostic } from 'typescript';
import { describe, expect, it } from 'vitest';
import '@/components/ui/popover';
import '@/lib/format-date';
import '@/components/charts/bar-list';
import '@/components/charts/column-chart';
import '@/components/charts/trend-chart';
import '@/components/patterns/proposal';

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * The files whose `@ts-expect-error` directives are the contract, relative to the repository root.
 *
 * The program also takes the project's test setup and its Next ambient file, which add the matcher and JSX types the
 * six files are written against; only diagnostics landing in one of the six above can fail this test.
 */
const CONTRACTS = [
  'tests/bar-list-forms.test.tsx',
  'tests/clock.test.tsx',
  'tests/column-chart-grouped.test.tsx',
  'tests/popover-name.test.tsx',
  'tests/proposal-approval.test.tsx',
  'tests/trend-chart-forms.test.tsx',
];
const AMBIENT = ['tests/setup.ts', 'next-env.d.ts'].filter((f) => existsSync(path.join(ROOT, f)));

/** One line per diagnostic that landed inside a contract file: the compiler's own words, with its file and line. */
function contractErrors(): string {
  const read = readConfigFile(path.join(ROOT, 'tsconfig.json'), sys.readFile);
  if (read.error) return `tsconfig.json could not be read: ${flatten([read.error])}`;
  const parsed = parseJsonConfigFileContent(read.config, sys, ROOT);
  const program = createProgram({ rootNames: [...CONTRACTS, ...AMBIENT].map((f) => path.join(ROOT, f)), options: { ...parsed.options, noEmit: true } });
  const inside = new Set(CONTRACTS.map((f) => path.join(ROOT, f)));
  return flatten(getPreEmitDiagnostics(program).filter((d) => d.file !== undefined && inside.has(path.resolve(d.file.fileName))));
}

function flatten(diagnostics: Diagnostic[]): string {
  return diagnostics
    .map((d) => {
      const where = d.file && d.start !== undefined ? `${path.relative(ROOT, d.file.fileName)}:${d.file.getLineAndCharacterOfPosition(d.start).line + 1}` : 'tsconfig.json';
      return `${where} TS${d.code}: ${typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText}`;
    })
    .join('\n');
}

describe('the type contracts the @ts-expect-error cases carry', () => {
  it('hold: a widened type makes its directive unused (TS2578), and this is what fails the run', () => {
    // The decisive line is the compiler's own first diagnostic in a contract file; an empty string is the pass.
    expect(contractErrors(), 'the six files that carry the directives compile clean, their directives all used').toBe('');
  }, 180_000);
});
