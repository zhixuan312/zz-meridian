import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ACTIONS } from '@/data/features';
import { effective } from '@/data/roles';
import * as sample from '@/data/sample';
import * as ops from '@/system/fixtures/sample-ops';
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
    expect(Object.keys(ACTIONS)).not.toContain('delete-workspace');
    expect(effective('Owner' as never, [] as never).has('workspace:remove' as never)).toBe(false);
    expect(effective('Owner' as never, [] as never).has('workspace:update' as never)).toBe(true);
  });

  it('promises no email', () => {
    const { container } = render(<SettingsBody may={may} />);
    expect(container.textContent).not.toMatch(/emails? you|Sent to /i);
  });
});

describe('Settings, on agents', () => {
  it('still says that every change an assistant proposes waits for approval', () => {
    render(<SettingsBody may={may} />);
    expect(screen.getByText('Every change an assistant proposes waits for approval')).toBeTruthy();
  });

  it('lists no connected host and offers nothing to disconnect: no read knows of one', () => {
    render(<SettingsBody may={may} />);
    expect(screen.queryAllByRole('button', { name: 'Disconnect' })).toEqual([]);
    // The list's own heading, "Connected · 2".
    expect(screen.queryByText(/^Connected ·/)).toBeNull();
  });
});

describe('the sample\'s data', () => {
  it('holds no list of hosts, in what the pages import or in the fixtures behind it', () => {
    expect(Object.keys(sample)).not.toContain('CONNECTED_HOSTS');
    expect(Object.keys(ops)).not.toContain('CONNECTED_HOSTS');
  });
});
