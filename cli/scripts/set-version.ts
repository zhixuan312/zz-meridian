/**
 * Set the release version everywhere it lives: the published package (cli/package.json) and the template
 * (package.json). Refuses a version that is not semver, and one whose CHANGELOG.md section is missing, since CI lifts
 * that section into the GitHub Release.
 *
 *   node cli/scripts/set-version.ts 0.2.0
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const v = process.argv[2] ?? '';
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(v)) throw new Error(`"${v}" is not a semver version`);
if (!fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8').includes(`## [${v}]`)) throw new Error(`CHANGELOG.md has no "## [${v}]" section: write it first`);

for (const f of ['cli/package.json', 'package.json']) {
  const file = path.join(ROOT, f);
  const text = fs.readFileSync(file, 'utf8');
  const next = text.replace(/("version":\s*")[^"]+(")/, `$1${v}$2`);
  if (next === text && !text.includes(`"version": "${v}"`)) throw new Error(`${f} has no "version" field`);
  fs.writeFileSync(file, next);
}
const got = ['cli/package.json', 'package.json'].map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')).version);
if (got.some((g) => g !== v)) throw new Error(`versions disagree after writing: ${got.join(', ')}`);
console.log(`version ${v}: cli/package.json and package.json`);
