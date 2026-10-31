import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { effective } from '@/data/roles';
import { SettingsBody } from '@/views/settings';

// Every section is drawn for a person who may do everything.
const may = { workspaceRead: true, workspaceUpdate: true };

describe('Settings', () => {
  it('offers no switch whose answer nothing keeps', () => {
    render(<SettingsBody may={may} />);
    for (const label of ['Incident alerts', 'Weekly digest', 'Spend over budget', 'Agent proposals', 'Let assistants read dashboards']) expect(screen.queryByText(label), label).toBeNull();
  });

  it('offers no deletion that deletes nothing, and nothing in the product still asks for the right to', () => {
    render(<SettingsBody may={may} />);
    expect(screen.queryAllByRole('button', { name: /Delete workspace/ })).toEqual([]);
    expect(effective('Owner' as never, [] as never).has('workspace:remove' as never)).toBe(false);
    expect(effective('Owner' as never, [] as never).has('workspace:update' as never)).toBe(true);
  });

});

describe('Settings, on agents', () => {

  it('lists no connected host and offers nothing to disconnect: no read knows of one', () => {
    render(<SettingsBody may={may} />);
    expect(screen.queryAllByRole('button', { name: 'Disconnect' })).toEqual([]);
    // The list's own heading, "Connected · 2".
    expect(screen.queryByText(/^Connected ·/)).toBeNull();
  });
});

