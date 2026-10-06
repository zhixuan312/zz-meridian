import fs from 'node:fs';
import path from 'node:path';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Overview from '../app/(dashboard)/(overview)/loading';
import Analytics from '../app/(dashboard)/analytics/loading';
import Customers from '../app/(dashboard)/customers/loading';
import Health from '../app/(dashboard)/health/loading';
import Keys from '../app/(dashboard)/keys/loading';
import Members from '../app/(dashboard)/members/loading';
import Requests from '../app/(dashboard)/requests/loading';
import RequestDetail from '../app/(dashboard)/requests/[id]/loading';
import Settings from '../app/(dashboard)/settings/loading';

const ROUTES = { Overview, Analytics, Customers, Health, Keys, Members, Requests, RequestDetail, Settings };

describe('every console route has its own loading state', () => {
  it('drops the shared Overview fallback', () => {
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
