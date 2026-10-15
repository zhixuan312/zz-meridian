// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsBody } from '@/views/settings';

const ALL = { workspaceRead: true, workspaceUpdate: true };
const READ = { workspaceRead: true, workspaceUpdate: false };
const NONE = { workspaceRead: false, workspaceUpdate: false };
const settings = (may: typeof ALL) => renderToStaticMarkup(<SettingsBody may={may} />);

describe('the settings page by need', () => {
  it('shows everything to someone who may change the workspace', () => {
    const html = settings(ALL);
    // The Assistant section waits on its own promise behind a Suspense boundary, so what renders here is its
    // placeholder; tests/assistant-settings.test.tsx is what settles that section, and this check leaves it alone.
    for (const s of ['Workspace', 'Appearance', 'Agents and MCP']) expect(html, s).toContain(s);
    for (const s of ['Notifications', 'Danger zone']) expect(html, s).not.toContain(s);
    expect(html).not.toContain('Read-only');
    expect(html).not.toContain('Only an Owner can change the workspace.');
  });

  it('shows the workspace read-only, saying so and naming nobody who could change it', () => {
    const html = settings(READ);
    expect(html).toContain('Workspace');
    expect(html).toContain('Read-only');
    expect(html).not.toMatch(/\bOnly an? \b|\bAsk an? (Owner|Admin)\b|\b(Owners|Admins)\b/);
    expect(html).not.toContain('Save changes');
  });

  it('shows no workspace, and everything else, to a member', () => {
    const html = settings(NONE);
    // The section itself is absent, which is the case's whole point: "Only an Owner…" is a sentence the component no
    // longer carries anywhere, and "Save changes" only appears once the form is dirty, so neither could fail.
    expect(html).not.toContain('>Workspace<');
    expect(html).not.toContain('Only an Owner can change the workspace.');
    expect(html).not.toContain('Save changes');
    for (const s of ['Appearance', 'Agents and MCP']) expect(html, s).toContain(s);
  });
});
