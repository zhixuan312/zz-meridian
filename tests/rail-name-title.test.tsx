import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// A product name of 23 characters, three words: the rail's head cuts it at every width (#79).
vi.mock('@/app.config', async (real) => ({ ...(await real<typeof import('@/app.config')>()), app: { ...(await real<typeof import('@/app.config')>()).app, name: 'Northwind Treasury Console' } }));

import { Home } from 'lucide-react';
import { Rail } from '@/components/patterns/rail';

const nav = [{ label: 'Group', items: [{ href: '/', label: 'Home', icon: Home, needs: 'public' as const }] }];

describe('the rail\'s head (#79)', () => {
  it('keeps the whole product name and workspace in a title, so a name cut to the rail is still read whole', () => {
    const { container } = render(<Rail nav={nav} user={null} workspace="Treasury operations, Europe and Asia" />);
    const name = [...container.querySelectorAll('span.truncate')].find((s) => s.textContent === 'Northwind Treasury Console');
    const workspace = [...container.querySelectorAll('span.truncate')].find((s) => s.textContent === 'Treasury operations, Europe and Asia');
    expect(name).toHaveAttribute('title', 'Northwind Treasury Console');
    expect(workspace).toHaveAttribute('title', 'Treasury operations, Europe and Asia');
  });

  // WCAG 2.5.3: the visible text of the menu trigger has to be in its name. The name is "<app>, <workspace>: account
  // menu"; with no space between the two spans the visible text ran them together and axe read a word that name does
  // not hold (#84). The blocks make the space invisible, so it costs the layout nothing.
  it('separates the product name and the workspace, so the trigger\'s visible text is in its name', () => {
    const { container } = render(<Rail nav={nav} user={null} workspace="Treasury operations, Europe and Asia" />);
    const trigger = container.querySelector('button[aria-label$="account menu"]')!;
    expect(trigger.textContent).toContain('Northwind Treasury Console Treasury operations, Europe and Asia');
  });
});
