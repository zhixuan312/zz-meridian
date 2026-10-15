// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { systemPrompt, type Audience } from '@/lib/assistant/prompt';

/**
 * What a person may not read is shown to the roles that can, on the pages that hold it. Told only who can read the
 * compute cost, the assistant said a Viewer's Home "doesn't surface it" for those roles either; told nothing of where
 * keys are made, it sent a Viewer to Settings (scoreboard round 5, W8). Told no page for compute cost, it said no page
 * holds it and Home has no gross margin; told that /keys tells the person who can open it, it offered /keys as where a
 * Viewer makes a key (AC-14.8 at review, C1 and C2). The prompt names each page that shows it to those roles, says
 * whether the person may open that page, names what is worked out from it, and never offers a page the person may not
 * open as where they make a change. Told only who reads keys, it told a Viewer to ask a Member to create one, which a
 * Member cannot (the second reading, D3): it names who may make each change apart from who may read it.
 */
const page = { path: '/', title: 'Home', text: '' };
const NOW = new Date('2026-10-03T12:00:00Z');
const viewer: Audience = {
  addresses: [{ label: 'Home', address: '/' }],
  withheld: [
    { label: 'Compute cost', roles: ['Owner', 'Admin'], pages: [{ label: 'Home', address: '/', open: true }], derived: ['Gross margin'] },
    {
      label: 'API keys', roles: ['Owner', 'Admin', 'Member'], pages: [{ label: 'API keys', address: '/keys', open: false }],
      changes: [{ op: 'create', roles: ['Owner', 'Admin', 'Key manager'] }, { op: 'remove', roles: ['Owner', 'Admin', 'Key manager'] }],
    },
    { label: 'Workspace', roles: ['Owner', 'Admin'], changes: [{ op: 'update', roles: ['Owner'] }] },
    { label: 'Members', roles: ['Owner', 'Admin', 'Member'], changes: [{ op: 'create', roles: ['Owner', 'Admin'] }, { op: 'update', roles: ['Owner'] }, { op: 'remove', roles: ['Owner', 'Admin'] }] },
    { label: 'Audit', roles: ['Owner'] },
  ],
};
const lineOf = (prompt: string, label: string) => prompt.split('\n').find((l) => l.startsWith(`- ${label}: `)) ?? '';

describe('the prompt on what the person may not read', () => {
  it('says the pages that hold it show it to those roles, and sends the person to no page that does not', () => {
    const prompt = systemPrompt(page, NOW, '', [], viewer);
    expect(prompt).toContain('- Compute cost: Owner or Admin can read it.');
    expect(prompt).toMatch(/pages named with it show it to those roles/);
    expect(prompt).toMatch(/never send the person to a page that does not hold it/i);
    expect(prompt).toMatch(/never say a page has no place for it/);
  });

  it('names a page the person may open as one that shows it to those roles, and what is worked out from it', () => {
    const line = lineOf(systemPrompt(page, NOW, '', [], viewer), 'Compute cost');
    expect(line).toBe('- Compute cost: Owner or Admin can read it. Home (/) shows it to those roles; this person can open Home, where it is not shown to them. Worked out from it, and so withheld with it: Gross margin.');
    expect(line).not.toMatch(/who can open/);
  });

  it('names a page the person may not open as one they may not open, which tells them who can', () => {
    const line = lineOf(systemPrompt(page, NOW, '', [], viewer), 'API keys');
    expect(line).toBe('- API keys: Owner, Admin or Member can read it. Owner, Admin or Key manager can create or remove it. API keys (/keys) shows it to those roles; this person may not open it, and it tells them who can.');
  });

  it('names who may make each change apart from who may read it, and a refused change by who may make it', () => {
    const prompt = systemPrompt(page, NOW, '', [], viewer);
    expect(lineOf(prompt, 'Workspace')).toBe('- Workspace: Owner or Admin can read it. Owner can change it.');
    expect(lineOf(prompt, 'Members')).toBe('- Members: Owner, Admin or Member can read it. Owner or Admin can create or remove it; Owner can change it.');
    expect(prompt).toMatch(/say it is not a change they can make, and who can make it where that is named/);
  });

  it('names no page where none holds it', () => {
    expect(lineOf(systemPrompt(page, NOW, '', [], viewer), 'Audit')).toBe('- Audit: Owner can read it.');
  });

  it('never offers a page the person may not open as where they make a change', () => {
    const prompt = systemPrompt(page, NOW, '', [], viewer);
    expect(prompt).toMatch(/give that page's address when it is one this person may open/);
    expect(prompt).toMatch(/A page they may not open is never where they can make a change/);
  });

  it('says nothing of it when nothing is withheld, as under refusal "absent"', () => {
    const prompt = systemPrompt(page, NOW, '', [], { addresses: viewer.addresses });
    expect(prompt).not.toMatch(/pages named with it show it/);
  });
});
