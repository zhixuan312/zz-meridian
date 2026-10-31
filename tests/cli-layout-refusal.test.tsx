import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const access = vi.hoisted(() => ({ scope: Promise.withResolvers<{ tenantId: string; subjectId: string }>() }));
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }), usePathname: () => '/members' }));
vi.mock('@/data/access', () => ({ resolveAccess: () => access.scope.promise, chromeAccess: async () => null }));
vi.mock('@/logic/alerts', () => ({ readAlerts: async () => null }));
vi.mock('@/views/workspace-chrome', () => ({ WorkspaceRail: () => null, WorkspacePalette: () => null }));
// Presentation is not this boundary: the real ConsoleLive and AssistantScope still consume the layout's promises.
vi.mock('@/components/base/shell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }));

import DashboardLayout from '../app/(dashboard)/layout';
import { served } from './served';

describe('a page-owned authentication response', () => {
  it('is not replaced by a streamed frame error when ambient live identity cannot resolve', async () => {
    access.scope = Promise.withResolvers();
    const document = served(DashboardLayout({ children: <p>Page-owned sign-in response</p> }));
    access.scope.reject(new Error('Sign in to continue.'));
    await expect(document).resolves.toContain('Page-owned sign-in response');
  });
});
