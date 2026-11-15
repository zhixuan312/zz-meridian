// The Atlas renders three command panels at once to show the open, filtered and empty states. The list and option ids were
// literals (`cmd-list`, `cmd-${id}`), so the second and third panels' `aria-controls` and `aria-activedescendant` resolved
// to the first panel's list: a screen reader on those specimens was told the wrong option and the wrong result set.
import { render } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it } from 'vitest';
import { CommandPanel } from '@/components/patterns/command-palette';

const commands = [
  { id: 'home', label: 'Go to Home', hint: '/', group: 'Go to', run: () => {} },
  { id: 'members', label: 'Go to Members', hint: '/members', group: 'Go to', run: () => {} },
];

function panel(query: string) {
  return <CommandPanel query={query} onQuery={() => {}} commands={commands as never} at={0} onAt={() => {}} onRun={() => {}} />;
}

describe('two command panels on one page', () => {
  it('point their field at their own list and their own highlighted option', () => {
    const { container } = render(<Tooltip.Provider><div data-one>{panel('')}</div><div data-two>{panel('')}</div></Tooltip.Provider>);
    const fields = [...container.querySelectorAll<HTMLInputElement>('input[role="combobox"]')];
    expect(fields).toHaveLength(2);
    const controls = fields.map((f) => f.getAttribute('aria-controls'));
    expect(controls[0]).not.toBe(controls[1]);
    for (const [i, field] of fields.entries()) {
      const list = document.getElementById(controls[i]!)!;
      // The list each field names is inside that field's own panel, not the other one.
      expect(field.closest('[data-one], [data-two]')!.contains(list)).toBe(true);
      const active = field.getAttribute('aria-activedescendant')!;
      const option = document.getElementById(active)!;
      expect(list.contains(option)).toBe(true);
    }
  });
});
