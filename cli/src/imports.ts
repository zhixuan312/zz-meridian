/**
 * Import specifiers in a common form, so two copies of a module that differ only in how they name the same modules
 * (`'../../ui/badge/index'` beside `'@/components/ui/badge'`) compare equal. `update` uses it to tell a file the team
 * only re-styled from one it changed (issue #16). Pure: the caller passes the aliases it read.
 */
import path from 'node:path';
import { parseJsonc } from './files.js';

/** The project's `@/*`-style aliases from its tsconfig's `paths` (best effort; a file it cannot read gives none). */
export function aliasesOf(tsconfig: string | null): Map<string, string> {
  const out = new Map<string, string>([['@meridian/', 'src/']]);
  if (!tsconfig) return out;
  try {
    const raw = parseJsonc(tsconfig);
    const options = raw?.compilerOptions ?? raw;
    const base = typeof options?.baseUrl === 'string' ? options.baseUrl : '.';
    for (const [alias, targets] of Object.entries(options?.paths ?? {})) {
      if (!/^@[\w-]*\/\*$/.test(alias) || !Array.isArray(targets) || typeof targets[0] !== 'string' || !/^[^*]*\*$/.test(targets[0])) continue;
      const dir = path.posix.normalize(path.posix.join(base, targets[0].slice(0, -1)));
      out.set(alias.slice(0, -1), dir === '.' || dir === './' ? '' : `${dir.replace(/\/$/, '')}/`);
    }
  } catch { return new Map(); } // Unreadable configuration proves no alias safe for an automatic overwrite.
  return out;
}

/** Leading static imports/re-exports with canonical paths. Everything after the first other statement stays exact. */
export function canonicalImports(rel: string, text: string, aliases: Map<string, string>): string {
  const canonical = (spec: string) => {
    let to: string | null = null;
    if (spec.startsWith('.')) to = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
    else for (const [alias, dir] of aliases) if (spec.startsWith(alias)) { to = path.posix.normalize(dir + spec.slice(alias.length)); break; }
    return to === null ? spec : to.replace(/\.(tsx?|jsx?|mjs)$/, '').replace(/\/index$/, '');
  };
  // This comparison authorizes overwriting a file, so a rendered string, template or comment must never be read as an
  // import. Recognize only the unambiguous declaration prefix; unusual syntax or imports after code remain edits for
  // the team to merge. No parser dependency is shipped in the CLI.
  const trivia = /(?:[\s;]+|\/\/[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/)/y;
  const directive = /(?:"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*')/y;
  const declaration = /(import\s*(?:[\w$\s{},*]+\bfrom\s*)?|export\s+[\w$\s{},*]+\bfrom\s*)(['"])([^'"\\\r\n]+)\2/y;
  let at = 0, out = '';
  while (at < text.length) {
    trivia.lastIndex = directive.lastIndex = declaration.lastIndex = at;
    const keep = trivia.exec(text) ?? directive.exec(text);
    if (keep) { out += keep[0]; at += keep[0].length; continue; }
    const match = declaration.exec(text);
    if (!match) break;
    out += `${match[1]}${match[2]}${canonical(match[3])}${match[2]}`;
    at += match[0].length;
  }
  return out + text.slice(at);
}
