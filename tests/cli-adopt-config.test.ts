// @vitest-environment node
// Named cli-* so the payload leaves it out: it runs the package's own adopt code against the template's configuration.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectConfig } from '../cli/src/adopt.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const template = fs.readFileSync(path.join(ROOT, 'src/app.config.ts'), 'utf8');
const written = projectConfig(template, ['/', '/orders', '/orders/returns']);

describe('the configuration adopt writes for a project', () => {
  it('lists the project\'s own pages, each public, and none of the sample\'s destinations', () => {
    for (const href of ['/', '/orders', '/orders/returns']) expect(written).toContain(`href: ${JSON.stringify(href)}`);
    expect(written.match(/needs: 'public'/g)?.length).toBe(3);
    for (const sample of ['/analytics', '/health', '/operations-tickets', '/system']) expect(written, sample).not.toContain(`'${sample}'`);
  });

  it('names nothing the project does not have: no feature table, no icon but its own, no workspace of the sample', () => {
    expect(written).not.toMatch(/\bFEATURES\b/);
    expect(written).not.toMatch(/\bworkspaces\b|\bWorkspaceId\b/);
    expect(written).not.toMatch(/\b(Main|Business|Engineering)\b/);
    const icons = written.match(/import \{([^}]*)\} from 'lucide-react';/)![1].split(',').map((n) => n.trim()).filter(Boolean);
    expect(icons).toEqual(['LayoutGrid', 'type LucideIcon']);
    // Every item names the one icon the file imports. (The item type's own `icon: LucideIcon` is a type, not an item.)
    expect(written.match(/\{ href: ["'][^\n]*/g)?.every((item) => /\bicon: LayoutGrid\b/.test(item))).toBe(true);
  });

  it('still exports what the components and the checks ask a configuration for', () => {
    for (const name of ['app', 'nav', 'slug']) expect(written, name).toMatch(new RegExp(`export const ${name}\\b`));
    for (const name of ['NavItem', 'NavGroup']) expect(written, name).toMatch(new RegExp(`export type ${name}\\b`));
    expect(written).toMatch(/workspace: 'Production'/);
  });

  it('is what the template says, where the template says nothing about the sample', () => {
    expect(template).toMatch(/\bworkspaces\b/);
    expect(template).toMatch(/\bFEATURES\b/);
    expect(written).toContain("name: 'ZZ Meridian'");
  });
});
