import { safeValidateUIMessages } from 'ai';
import { assistantConfig } from '@/lib/assistant/config';
import { clock, collections } from '@/data/collections';
import { respond } from '@/lib/assistant/respond';

/** The panel sends at most the last 100 messages; a larger body than 2 MB is refused before it is parsed. */
const MAX_MESSAGES = 100;
const MAX_BODY = 2_000_000;

/** `POST /api/assistant`: answers about the page the person is on. 404 until the `ASSISTANT_*` variables are set. */
export async function POST(request: Request): Promise<Response> {
  // Put your sign-in check here, the same place as the dashboard layout's: refuse before the model is reached.
  const config = assistantConfig(process.env);
  if (!config) return new Response(null, { status: 404 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response(null, { status: 413 });
  const body: unknown = (() => { try { return JSON.parse(raw); } catch { return null; } })();
  const { messages, page } = (body ?? {}) as { messages?: unknown; page?: { path?: unknown; title?: unknown; text?: unknown } };
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return new Response(null, { status: 400 });
  const valid = await safeValidateUIMessages({ messages });
  if (!valid.success) return new Response(null, { status: 400 });

  return respond({
    ...config,
    collections,
    now: clock(),
    messages: valid.data,
    page: { path: String(page?.path ?? ''), title: String(page?.title ?? ''), text: String(page?.text ?? '') },
  });
}
