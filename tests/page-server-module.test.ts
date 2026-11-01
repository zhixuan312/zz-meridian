// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const pages = (dir: string): string[] =>
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const here = `${dir}/${e.name}`;
    return e.isDirectory() ? pages(here) : e.name === 'page.tsx' ? [here] : [];
  });

/**
 * A page is a server module, so it can name itself: a page marked 'use client' cannot export `metadata`, and its tab and
 * history entry read the product's name alone. The client part of a page lives in a file beside it.
 */
describe('every page', () => {
  it('is a server module', () => {
    const all = pages('app');
    expect(all.length).toBeGreaterThan(0);
    const clients = all.filter((file) => {
      const source = ts.createSourceFile(file, fs.readFileSync(path.join(ROOT, file), 'utf8'), ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
      for (const statement of source.statements) {
        if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
        if (statement.expression.text === 'use client') return true;
      }
      return false;
    });
    expect(clients).toEqual([]);
  });
});
