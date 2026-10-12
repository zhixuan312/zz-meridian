// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the repository's own guides and package description.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('every place outside the Atlas that counts the layers', () => {
  it('no longer says five, and never says six layers of React components', () => {
    for (const file of ['README.md', 'package.json', 'CONTRIBUTING.md', 'scripts/tokens.ts']) {
      expect(read(file), file).not.toMatch(/\bfive layers\b|six layers of React/i);
    }
  });

  it('lists six in the README, under a heading that says so', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/^## The six layers$/m);
    for (const row of ['0 Tokens', '1 Base', '2 Components', '3 Patterns', '4 Pages', '5 Product workspaces']) expect(readme, row).toMatch(new RegExp(`^\\| ${row} \\|`, 'm'));
    expect(readme).toMatch(/six layers/i);
  });

  it('lists six in the contribution guide, and says where a product\'s workspaces live', () => {
    const guide = read('CONTRIBUTING.md');
    const row = guide.split('\n').find((l) => l.startsWith('| 5 Product workspaces |')) ?? '';
    expect(row).toContain('`src/app.config.ts`');
    expect(row).toContain('`docs/product-workspaces.md`');
  });

  it('says six in the package\'s description and in the header the tokens are written under', () => {
    expect(JSON.parse(read('package.json')).description).toMatch(/six layers/i);
    expect(read('scripts/tokens.ts')).toMatch(/Six layers/);
    expect(read('scripts/tokens.ts')).toMatch(/5 .*Product workspaces|Product workspaces/);
  });
});
