import { describe, expect, it } from 'vitest';
import { MANAGED_PATH } from '../cli/src/ownership.ts';

describe("the template's faces", () => {
  it('are files an update delivers', () => {
    for (const f of ['Geist-Variable.woff2', 'GeistMono-Variable.woff2', 'LICENSE.txt']) expect(MANAGED_PATH.test(`src/styles/fonts/${f}`)).toBe(true);
  });
});
