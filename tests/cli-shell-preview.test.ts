// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads a card's preview, which a product does not keep.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const preview = fs.readFileSync(path.resolve(import.meta.dirname, '../src/components/base/shell/preview.tsx'), 'utf8');

describe('the Shell\'s preview', () => {
  it('asks the leave question with the shell\'s own component, and holds no copy of its words', () => {
    expect(preview).toMatch(/<LeaveQuestion\b/);
    expect(preview).not.toContain('Leave without saving?');
    expect(preview).not.toMatch(/DIALOG_(PANEL|HEAD|FOOT)/);
  });

  it('says of the frame it draws that it is a diagram', () => {
    expect(preview).toMatch(/label="The frame, as a diagram"/);
  });
});
