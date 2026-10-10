// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KeysView } from '@/views/keys';
import { RequestView } from '@/views/request';

const key = { id: 'key_1', name: 'Load test, October', env: 'live', scopes: ['messages'], owner: 'Maya Chen', created: '2026-10-01', lastUsed: null, hint: 'zzm_live_xe389', secretHash: 'x' };
const LINE = 'Owners, Admins and Key managers create and revoke keys.';
const keys = (may: { create: boolean; revoke: boolean }, line?: string) =>
  renderToStaticMarkup(<KeysView rows={[key] as never} now="2026-10-04T00:00:00.000Z" may={may} line={line} createKey={async () => key as never} revokeKey={async () => {}} />);

describe('the keys page shows what the person may do', () => {
  it('hides Create key and Revoke, and says who can, when both are withheld', () => {
    const html = keys({ create: false, revoke: false }, LINE);
    expect(html).not.toContain('Create key');
    expect(html).not.toContain('Revoke Load test, October');
    expect(html.split(LINE).length - 1).toBe(1);
  });

  it('shows them, and no line, for a Key manager', () => {
    const html = keys({ create: true, revoke: true });
    expect(html).toContain('Create key');
    expect(html).toContain('Revoke Load test, October');
    expect(html).not.toContain(LINE);
  });
});

describe('the request detail shows Replay by failure and by grant', () => {
  const failed = { id: 'req_1', status: 500 };
  const view = (mayReplay: boolean) => renderToStaticMarkup(
    <RequestView request={failed as never} trace={[]} payloads={{ request: null, response: '{}' }} routeP95={null} now="2026-10-04T00:00:00.000Z" mayReplay={mayReplay} replayLine="Owners, Admins and Members can replay requests." replay={async (id: string) => ({ ok: true as const, id, status: 200 })} />,
  );

  it('shows Replay for a failed request the person may replay', () => {
    const html = view(true);
    expect(html).toContain('Replay');
    expect(html).not.toContain('can replay requests.');
  });

  it('hides it, and says who can, when the grant is missing', () => {
    const html = view(false);
    expect(html).not.toContain('>Replay<');
    expect(html.split('Owners, Admins and Members can replay requests.').length - 1).toBe(1);
  });
});
