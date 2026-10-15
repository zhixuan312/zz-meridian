// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { systemPrompt } from '@/lib/assistant/prompt';

/**
 * What a person may not read is shown to the roles that can, on the pages that hold it. Told only who can read the
 * compute cost, the assistant said a Viewer's Home "doesn't surface it" for those roles either; told nothing of where
 * keys are made, it sent a Viewer to Settings (scoreboard round 5, W8). The prompt says the pages that hold a withheld
 * record show it to those roles, and that the person is never sent to a page that does not hold it.
 */
const page = { path: '/', title: 'Home', text: '' };
const NOW = new Date('2026-10-03T12:00:00Z');
const viewer = { addresses: [{ label: 'Home', address: '/' }], withheld: [{ label: 'Compute cost', roles: ['Owner', 'Admin'] }, { label: 'API keys', roles: ['Owner', 'Admin', 'Member'] }] };

describe('the prompt on what the person may not read', () => {
  it('says the pages that hold it show it to those roles, and sends the person to no page that does not', () => {
    const prompt = systemPrompt(page, NOW, '', [], viewer);
    expect(prompt).toContain('- Compute cost: Owner or Admin can read it.');
    expect(prompt).toMatch(/pages that hold it show it to those roles/);
    expect(prompt).toMatch(/never send the person to a page that does not hold it/i);
  });

  it('says nothing of it when nothing is withheld, as under refusal "absent"', () => {
    const prompt = systemPrompt(page, NOW, '', [], { addresses: viewer.addresses });
    expect(prompt).not.toMatch(/pages that hold it show it/);
  });
});
