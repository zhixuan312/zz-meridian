// Named cli-* so the payload leaves it out: it reads the Dialog's own preview, which a product may not keep.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DialogPreview from '@/components/ui/dialog/preview';

// I-14 finding 9: a state colour always comes with a word or an icon. And for I-16: the xl specimen opens a live xl
// dialog beside its static panel.

const section = (label: string) => screen.getByRole('heading', { name: label }).closest('section')!;

describe('the Dialog\'s xl specimen', () => {
  it('says the critical p95 with an icon and a word, not with colour alone', () => {
    render(<DialogPreview />);
    const cells = [...section('xl · six columns').querySelectorAll('.text-critical-ink')];
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.querySelector('svg')).not.toBeNull();
      expect(cell.textContent).toMatch(/alert/i);
    }
  });

  it('keeps its static panel and opens a live dialog at size xl from a labelled trigger', () => {
    render(<DialogPreview />);
    const xl = section('xl · six columns');
    expect(xl.querySelector('table')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open the xl dialog' }));
    const panel = screen.getByRole('dialog');
    expect(panel.className).toMatch(/(^|\s)sm:max-w-240(\s|$)/);
    expect(panel.querySelector('table')).not.toBeNull();
  });
});
