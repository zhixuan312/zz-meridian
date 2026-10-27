import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toasts = vi.hoisted(() => [] as { tone: string; title: string }[]);
vi.mock('@/components/ui/toast', () => ({ UNDO_MS: 8000, toast: (t: { tone: string; title: string }) => { toasts.push(t); } }));

import { collections } from '@/data/collections';
import { SettingsBody, type SaveWorkspace } from '@/views/settings';

const may = { workspaceRead: true, workspaceUpdate: true };
const record = { name: 'Acme Production', slug: 'acme' };
const name = () => screen.getByLabelText(/^Name/) as HTMLInputElement;
const saveButton = () => screen.queryByRole('button', { name: 'Save changes' });
const type = (value: string) => fireEvent.change(name(), { target: { value } });
const press = async () => { await act(async () => { fireEvent.click(saveButton()!); }); };

beforeEach(() => { toasts.length = 0; });

describe('saving the workspace in Settings', () => {
  it('offers nothing to save until something differs from what is saved', () => {
    render(<SettingsBody may={may} workspace={record} save={async () => ({ ok: true })} />);
    expect(saveButton()).toBeNull();
    type('Acme Staging');
    expect(saveButton()).not.toBeNull();
    type(record.name);
    expect(saveButton()).toBeNull();
  });

  it('sends the name it shows, says it was saved, and has nothing left to save', async () => {
    const sent: unknown[] = [];
    const save: SaveWorkspace = async (input) => { sent.push(input); return { ok: true }; };
    render(<SettingsBody may={may} workspace={record} save={save} />);
    type('  Acme Staging ');
    await press();
    expect(sent).toEqual([{ name: 'Acme Staging' }]);
    expect(toasts).toEqual([expect.objectContaining({ tone: 'positive', title: 'Workspace saved' })]);
    await waitFor(() => expect(saveButton()).toBeNull());
    expect(name().value.trim()).toBe('Acme Staging');
  });

  it('says why a refused save did not go through, keeps what was typed and stays unsaved', async () => {
    const save: SaveWorkspace = async () => ({ ok: false, error: 'You do not have permission to make this change.' });
    render(<SettingsBody may={may} workspace={record} save={save} />);
    type('Acme Staging');
    await press();
    expect(screen.getByText('You do not have permission to make this change.')).toBeTruthy();
    expect(toasts).toEqual([]);
    expect(name().value).toBe('Acme Staging');
    expect(saveButton()).not.toBeNull();
    // Discarding puts the saved name back, and the sentence leaves with the edit it was about.
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(name().value).toBe(record.name);
    expect(screen.queryByText('You do not have permission to make this change.')).toBeNull();
  });

  it('says so when a save never answers, keeps what was typed and can save again', async () => {
    // A dropped connection throws: the form was left saying it was saving, for good.
    render(<SettingsBody may={may} workspace={record} save={async () => { throw new Error('Failed to fetch'); }} />);
    type('Acme Staging');
    await press();
    expect(screen.getByText('The change did not reach the server. Try again.')).toBeTruthy();
    expect(name().value).toBe('Acme Staging');
    expect(saveButton()).not.toBeNull();
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('does not send a name that is empty', async () => {
    const sent: unknown[] = [];
    render(<SettingsBody may={may} workspace={record} save={async (input) => { sent.push(input); return { ok: true }; }} />);
    type('   ');
    await press();
    expect(sent).toEqual([]);
    expect(toasts).toEqual([]);
  });
});

describe('what the workspace record holds', () => {
  it('is a name and an address, and no time zone: nothing in the product reads one from it', async () => {
    const { rows } = await collections.find((c) => c.name === 'workspace')!.query({});
    expect(Object.keys(rows[0]).sort()).toEqual(['id', 'name', 'slug']);
    render(<SettingsBody may={may} workspace={record} />);
    expect(screen.queryByLabelText(/Time zone/)).toBeNull();
    expect(screen.queryByText(/time zone/i)).toBeNull();
  });

  it('promises the name nowhere it does not appear', () => {
    const { container } = render(<SettingsBody may={may} workspace={record} />);
    expect(container.textContent).not.toMatch(/the rail|every date|daily total/i);
  });
});
