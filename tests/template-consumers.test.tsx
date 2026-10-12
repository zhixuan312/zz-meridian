import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// A consumer's own configuration: one workspace, its own destinations and person, and nothing of the sample's.
vi.mock('@/app.config', async () => {
  const { Home, Wrench } = await import('lucide-react');
  return {
    app: { name: 'Acme Ops', workspace: 'Workshop', accent: 'indigo', timezone: 'UTC', currency: 'USD', user: { name: 'Dana Ortiz', role: 'Admin' } },
    nav: [
      { items: [{ href: '/', label: 'Home', icon: Home, needs: 'public' }] },
      { label: 'Work', items: [{ href: '/jobs', label: 'Jobs', icon: Wrench, needs: 'public' }] },
    ],
    slug: 'acme-ops',
  };
});

import { DataTable } from '@/components/patterns/data-table';
import { Records } from '@/components/templates/records';
import { Button } from '@/components/ui/button';
import { ConsoleRail } from '@/views/console-chrome';

const ROOT = path.resolve(import.meta.dirname, '..');
const links = () => screen.queryAllByRole('link').map((l) => l.textContent);

/** Every source file under `dir`, as a path from the repository root. */
function walk(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
}
/** What a project that adopted Meridian is given and has overwritten by an update: the components without their previews, and the console's chrome. */
const MANAGED = [...walk('src/components').filter((f) => /\.tsx?$/.test(f) && !/(^|\/)preview\.tsx$/.test(f)), 'src/views/console-chrome.tsx'];
/** What every project's configuration exports, whoever wrote it. */
const CONFIGURED = ['app', 'nav', 'slug', 'NavGroup', 'NavItem'];

describe('a product with one workspace and its own configuration', () => {
  it('gets its own name, person and destinations from the rail, with nothing passed', async () => {
    await act(async () => { render(<ConsoleRail />); });
    expect(links()).toEqual(['Home', 'Jobs']);
    expect(screen.getByRole('button', { name: 'Acme Ops, Workshop: account menu' })).toBeTruthy();
    expect(screen.getByText('Dana Ortiz')).toBeTruthy();
    expect(screen.queryByText('Maya Chen')).toBeNull();
  });

  it('hands the rail its own session, with nobody else to view the console as', async () => {
    await act(async () => { render(<ConsoleRail access={Promise.resolve({ only: ['/jobs'], user: { name: 'Sam Lee', role: 'Mechanic' } })} />); });
    expect(await screen.findByText('Sam Lee')).toBeTruthy();
    expect(links()).toEqual(['Jobs']);
    fireEvent.keyDown(screen.getByRole('button', { name: /account menu$/ }), { key: 'Enter' });
    const menu = await screen.findByRole('menu');
    expect(menu.textContent).toContain('Sign out');
    expect(menu.textContent).not.toContain('View as');
    expect(menu.textContent).not.toContain('Show');
  });
});

describe('a page template, given its rows and its action', () => {
  it('draws what it is handed and runs what it is handed', () => {
    type Job = { id: string; title: string };
    const rows: Job[] = [{ id: 'j1', title: 'Replace belt' }, { id: 'j2', title: 'Balance wheels' }];
    const add = vi.fn();
    const { container } = render(
      <Records summary={<p>Open jobs: {rows.length}</p>}>
        <DataTable caption="Jobs" noun="jobs" rows={rows} columns={[{ key: 'title', header: 'Job', cell: (j: Job) => j.title }]} rowKey={(j) => j.id} toolbar={<Button onClick={add}>Add job</Button>} />
      </Records>,
    );
    const template = container.querySelector('[data-template="records"]');
    expect(template).not.toBeNull();
    expect(template!.querySelector('[data-split="tiles"]')!.textContent).toBe('Open jobs: 2');
    expect([...template!.querySelectorAll('tbody tr')].map((r) => r.textContent)).toEqual(['Replace belt', 'Balance wheels']);
    fireEvent.click(screen.getByRole('button', { name: 'Add job' }));
    expect(add).toHaveBeenCalledTimes(1);
  });
});

describe('the code a project is given', () => {
  it('imports no data, view or system module of the sample', () => {
    expect(MANAGED.length).toBeGreaterThan(50);
    for (const f of MANAGED) expect(fs.readFileSync(path.join(ROOT, f), 'utf8'), f).not.toMatch(/from '@\/(data|views|system)[/']/);
  });

  it("asks the product's configuration only for what every project's configuration has", () => {
    const asked = new Set<string>();
    for (const f of MANAGED) {
      for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'@\/app\.config'/g)) {
        for (const name of m[1].split(',').map((n) => n.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean)) {
          expect(CONFIGURED, `${f} imports ${name}`).toContain(name);
          asked.add(name);
        }
      }
    }
    expect([...asked].sort()).toContain('nav');
  });
});
