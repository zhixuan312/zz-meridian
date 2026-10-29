// @vitest-environment node
// A cli- test: it pins the template's own route, and a project's route is its own.
import { afterEach, describe, expect, test, vi } from 'vitest';
import { POST } from '../app/api/assistant/route';
import { collections, members } from '@/data/collections';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));

const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; vi.restoreAllMocks(); });

// Every view tool and rail item asked `may`, and each `may` resolved the caller again: one message read the roster 89
// times before the model was reached. The needs are asked of one resolved member (`mayEach`); what is left is one grant
// check per collection, which `can` makes on purpose, and the caller and its boundaries.
describe('POST /api/assistant reads the roster', () => {
  test('a bounded number of times per message, not once per view tool and rail item', async () => {
    Object.assign(process.env, { ASSISTANT_PROVIDER: 'openai-compatible', ASSISTANT_API_KEY: 'k', ASSISTANT_MODEL: 'm', ASSISTANT_BASE_URL: 'http://127.0.0.1:9/v1' });
    const query = vi.spyOn(members, 'query');
    await POST(new Request('http://localhost/api/assistant', { method: 'POST', body: JSON.stringify({ messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }], page: { path: '/members', title: 'Members', text: '' } }) }));
    expect(query.mock.calls.length).toBeLessThanOrEqual(collections.length + 15);
  });
});
