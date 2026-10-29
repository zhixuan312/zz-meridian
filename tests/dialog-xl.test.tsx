import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DIALOG_WIDTH, Dialog, DialogContent } from '@/components/ui/dialog';

// A dialog wide enough for a table of six columns, and where a wider table goes.

describe('Dialog size="xl"', () => {
  it('is 960px wide on a desk (sm:max-w-240 on the 4px unit) and a bottom sheet on a phone', () => {
    expect(DIALOG_WIDTH.xl).toBe('sm:max-w-240');
    render(<Dialog open><DialogContent title="Evidence" size="xl">Six readings</DialogContent></Dialog>);
    const panel = screen.getByRole('dialog');
    expect(panel.className).toMatch(/(^|\s)sm:max-w-240(\s|$)/);
    expect(panel.className).toMatch(/(^|\s)inset-x-0(\s|$)/);
    expect(panel.className).toMatch(/(^|\s)bottom-0(\s|$)/);
  });

  it('says in its README where a wide table goes', () => {
    const md = fs.readFileSync(path.join(import.meta.dirname, '../src/components/ui/dialog/README.md'), 'utf8');
    expect(md).toMatch(/\|\s*xl\s*\|\s*960px\s*\|/);
    expect(md).toMatch(/six columns/i);
    expect(md).toMatch(/its own page/i);
  });
});
