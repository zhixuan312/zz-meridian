import fs from 'node:fs';
import path from 'node:path';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from '../app/(dashboard)/(home)/loading';
import Usage from '../app/(dashboard)/usage/loading';
import Customers from '../app/(dashboard)/customers/loading';
import Services from '../app/(dashboard)/services/loading';
import Keys from '../app/(dashboard)/keys/loading';
import Members from '../app/(dashboard)/members/loading';
import Tickets from '../app/(dashboard)/operations-tickets/loading';
import Releases from '../app/(dashboard)/releases/loading';
import Requests from '../app/(dashboard)/requests/loading';
import RequestDetail from '../app/(dashboard)/requests/[id]/loading';
import Settings from '../app/(dashboard)/settings/loading';
import Tests from '../app/(dashboard)/tests/loading';

import Revenue from '../app/(dashboard)/business/loading';
import Customer from '../app/(dashboard)/customers/[id]/loading';
import Now from '../app/(dashboard)/engineering/loading';

const ROUTES = { Home, Usage, Customers, Services, Keys, Members, Requests, RequestDetail, Settings, Tickets, Tests, Releases };

describe('a page headed by a sentence', () => {
  it('holds the sentence\'s block while it loads, under its name, so nothing moves when the page arrives', () => {
    for (const [name, Loading] of Object.entries({ Home, Usage, Revenue, Customer, Now, Services })) {
      render(<Loading />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.textContent, name).toBe(`${name}: `);
      expect(heading.querySelector('[data-title-pending]'), name).not.toBeNull();
      expect(heading.className, name).not.toMatch(/\bt-page\b/);
      cleanup();
    }
  });

  it('is told apart from a page headed by its name, which draws the name at once', () => {
    render(<Customers />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Customers');
    expect(screen.getByRole('heading', { level: 1 }).querySelector('[data-title-pending]')).toBeNull();
  });
});

describe('every console route has its own loading state', () => {
  it('drops the shared Home fallback', () => {
    expect(fs.existsSync(path.resolve(import.meta.dirname, '../app/(dashboard)/loading.tsx'))).toBe(false);
  });
  it('announces each as busy, under its own name', () => {
    const shapes = new Set<string>();
    const labels = new Set<string>();
    for (const [name, Loading] of Object.entries(ROUTES)) {
      render(<Loading />);
      const status = screen.getByRole('status');
      expect(status.getAttribute('aria-busy'), name).toBe('true');
      const label = status.getAttribute('aria-label') ?? '';
      expect(label, name).toMatch(/^Loading \S/);
      expect(label.toLowerCase(), name).toContain(name === 'RequestDetail' ? 'request' : name.toLowerCase());
      labels.add(label);
      expect(screen.getAllByRole('status'), `${name}: one busy region`).toHaveLength(1);
      expect(screen.queryAllByRole('heading', { level: 1 }).length, `${name}: the masthead is not drawn twice`).toBeLessThanOrEqual(1);
      shapes.add(status.innerHTML);
      cleanup();
    }
    expect(labels.size, 'each route names itself').toBe(Object.keys(ROUTES).length);
    expect(shapes.size, 'route-shaped, not one skeleton for all').toBeGreaterThanOrEqual(5);
  });
});
