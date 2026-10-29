// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KeysView } from '@/views/keys';
import { RequestView } from '@/views/request';

const key = { id: 'key_1', name: 'Load test, October', env: 'live', scopes: ['messages'], owner: 'Maya Chen', created: '2026-10-01', lastUsed: null, hint: 'zzm_live_xe389', secretHash: 'x' };
/** A sentence that names roles beside what they may do: what a page that withholds a control must not draw. */
const WHO_CAN = /\b(Owners|Admins|Members|Viewers|Key managers)\b|\bOnly an? \b|\bAsk an? (Owner|Admin)\b/;
const keys = (may: { create: boolean; revoke: boolean }) =>
  renderToStaticMarkup(<KeysView rows={[key] as never} now="2026-10-04T00:00:00.000Z" may={may} createKey={async () => ({ ok: true, key }) as never} revokeKey={async () => ({ ok: true })} />);

describe('the keys page shows what the person may do', () => {
  it('hides Create key and Revoke, and says nothing about who can, when both are withheld', () => {
    const html = keys({ create: false, revoke: false });
    expect(html).not.toContain('Create key');
    expect(html).not.toContain('Revoke Load test, October');
    expect(html).not.toMatch(WHO_CAN);
  });

  it('shows them, and no line, for a Key manager', () => {
    const html = keys({ create: true, revoke: true });
    expect(html).toContain('Create key');
    expect(html).toContain('Revoke Load test, October');
    expect(html).not.toMatch(WHO_CAN);
  });
});

describe('the request detail shows Replay by failure and by grant', () => {
  const failed = { id: 'req_1', status: 500 };
  const view = (mayReplay: boolean) => renderToStaticMarkup(
    <RequestView request={failed as never} trace={[]} payloads={{ request: null, response: '{}' }} routeP95={null} now="2026-10-04T00:00:00.000Z" mayReplay={mayReplay} replay={async (id: string) => ({ ok: true as const, id, status: 200 })} />,
  );

  // The control, not the word: "Replay of <id>" is a fact on the same page, so a test that looked for the string passed
  // on a page with no button at all.
  const REPLAY_BUTTON = /<button[^>]*>(?:(?!<\/button>)[\s\S])*?Replay(?:(?!<\/button>)[\s\S])*?<\/button>/;

  it('shows Replay for a failed request the person may replay', () => {
    const html = view(true);
    expect(html).toMatch(REPLAY_BUTTON);
    expect(html).not.toMatch(WHO_CAN);
  });

  it('hides it, and says nothing about who can, when the grant is missing', () => {
    const html = view(false);
    expect(html).not.toMatch(REPLAY_BUTTON);
    expect(html).not.toMatch(WHO_CAN);
  });
});
