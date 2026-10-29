// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RELEASE_MIGRATIONS } from '../cli/src/migrations.ts';

const doc = (rel: string) => fs.readFileSync(path.resolve(import.meta.dirname, '..', rel), 'utf8');

describe("the update reference's migrations", () => {
  // An update reports `migration:<id>` and sends the agent to this page to resolve it: an id with no row leaves it guessing.
  it('give every release migration a row', () => {
    const text = doc('skills/zz-meridian/references/update.md');
    const rowless = RELEASE_MIGRATIONS.map((m) => m.id).filter((id) => !new RegExp(`^\\| \`${id}\``, 'm').test(text));
    expect(rowless).toEqual([]);
  });
});
