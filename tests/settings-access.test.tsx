import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsBody } from '@/views/settings';

const ALL = { workspaceRead: true, workspaceUpdate: true };
const READ = { workspaceRead: true, workspaceUpdate: false };
const NONE = { workspaceRead: false, workspaceUpdate: false };
// The page always hands the section its save; what decides the rest is what the person may do.
const settings = (may: typeof ALL) => renderToStaticMarkup(<SettingsBody may={may} save={async () => ({ ok: true })} />);
/** Whether the workspace's Name field takes an edit, read from the page as a browser would parse it. */
const nameEditable = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const label = [...doc.querySelectorAll('label')].find((l) => l.textContent?.trim() === 'Name')!;
  return !doc.getElementById(label.htmlFor)!.matches(':disabled');
};

describe('the settings page by need', () => {
  it('shows everything to someone who may change the workspace', () => {
    const html = settings(ALL);
    // The Assistant section waits on its own promise behind a Suspense boundary, so what renders here is its
    // placeholder; tests/assistant-settings.test.tsx is what settles that section, and this check leaves it alone.
    for (const s of ['Workspace', 'Appearance', 'Agents and MCP']) expect(html, s).toContain(s);
    // Two sections the page no longer has, because nothing stood behind them, stay gone.
    for (const s of ['Notifications', 'Danger zone']) expect(html, s).not.toContain(s);
    expect(html).not.toContain('Read-only');
    expect(nameEditable(html)).toBe(true);
  });

  it('shows the workspace read-only, saying so and naming nobody who could change it', () => {
    const html = settings(READ);
    expect(html).toContain('Workspace');
    expect(html).toContain('Read-only');
    expect(html).not.toMatch(/\bOnly an? \b|\bAsk an? (Owner|Admin)\b|\b(Owners|Admins)\b/);
    expect(nameEditable(html)).toBe(false);
  });

  it('shows no workspace, and everything else, to a member', () => {
    const html = settings(NONE);
    expect(html).not.toContain('>Workspace<');
    for (const s of ['Appearance', 'Agents and MCP']) expect(html, s).toContain(s);
  });
});
