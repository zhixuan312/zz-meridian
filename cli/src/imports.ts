/**
 * Import specifiers in a common form, so two copies of a module that differ only in how they name the same modules
 * (`'../../ui/badge/index'` beside `'@/components/ui/badge'`) compare equal. `update` uses it to tell a file the team
 * only re-styled from one it changed (issue #16). Pure: the caller passes the aliases it read.
 */
import path from 'node:path';

/** The project's `@/*`-style aliases from its tsconfig's `paths` (best effort; a file it cannot read gives none). */
export function aliasesOf(tsconfig: string | null): Map<string, string> {
  const out = new Map<string, string>([['@meridian/', 'src/']]);
  if (!tsconfig) return out;
  // `"@/*": ["./src/*"]` maps `@/` to `src/`; `"@/*": ["./*"]` maps it to the project root.
  for (const m of tsconfig.matchAll(/"(@[\w-]*)\/\*"\s*:\s*\[\s*"([^"*]*)\*"/g)) out.set(`${m[1]}/`, m[2]!.replace(/^\.\//, ''));
  return out;
}

/** `text` with every literal module specifier rewritten as the project path it names, extension and `/index` dropped. */
export function canonicalImports(rel: string, text: string, aliases: Map<string, string>): string {
  const canonical = (spec: string) => {
    let to: string | null = null;
    if (spec.startsWith('.')) to = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
    else for (const [alias, dir] of aliases) if (spec.startsWith(alias)) { to = path.posix.normalize(dir + spec.slice(alias.length)); break; }
    return to === null ? spec : to.replace(/\.(tsx?|jsx?|mjs)$/, '').replace(/\/index$/, '');
  };
  return text.replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"\n]+)\2/g, (_m, lead: string, q: string, spec: string) => `${lead}${q}${canonical(spec)}${q}`);
}
