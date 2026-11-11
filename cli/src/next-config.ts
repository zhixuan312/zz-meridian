/**
 * The two flags a build needs for the prerender modes the route policy reads. Next writes `renderingMode` into its
 * prerender manifest only with Cache Components and partial prefetching on, and the policy calls a route dynamic when
 * the manifest does not say; without the flags it cannot read the build at all. A project that has them off is a
 * project whose build the policy presupposes nothing about, so finalize reports the policy not run for it and never
 * judges the build (docs/testing.md, "An update's finalize"). The two flags are read as text, as the migration reads
 * them: the CLI runs on Node and cannot import a project's TypeScript config.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * The Next config files Next itself reads, in its order (`CONFIG_FILES` in next/dist/shared/lib/constants.js):
 * `next.config.js`, then `.mjs`, then `.ts`, then `.mts`. It never reads a `.cjs` config. The first one a project has
 * is its config.
 */
export const NEXT_CONFIG_FILES = ['next.config.js', 'next.config.mjs', 'next.config.ts', 'next.config.mts'];

/** The config files this project has, in Next's order. */
export function nextConfigFiles(root: string): string[] {
  return NEXT_CONFIG_FILES.filter((f) => fs.existsSync(path.join(root, f)));
}

/** Whether a config's source sets both flags. */
export function setsPprFlags(src: string): boolean {
  return /\bcacheComponents\s*:\s*true\b/.test(src) && /\bpartialPrefetching\s*:\s*true\b/.test(src);
}

/** Whether the project's config sets both flags. A project with no config has neither, and reads as `false`. */
export function hasPprFlags(root: string): boolean {
  const [file] = nextConfigFiles(root);
  if (!file) return false;
  try {
    return setsPprFlags(fs.readFileSync(path.join(root, file), 'utf8'));
  } catch {
    return false;
  }
}
