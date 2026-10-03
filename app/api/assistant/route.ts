import type { UIMessage } from 'ai';
import { assistantConfig } from '@/lib/assistant/config';
import { respond } from '@/lib/assistant/respond';

/** `POST /api/assistant`: answers about the page the person is on. 404 until the `ASSISTANT_*` variables are set. */
export async function POST(request: Request): Promise<Response> {
  // Put your sign-in check here, the same place as the dashboard layout's: refuse before the model is reached.
  const config = assistantConfig(process.env);
  if (!config) return new Response(null, { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  const { messages, page } = (body ?? {}) as { messages?: unknown; page?: { path?: unknown; title?: unknown; text?: unknown } };
  if (!Array.isArray(messages)) return new Response(null, { status: 400 });

  return respond({
    ...config,
    messages: messages as UIMessage[],
    page: { path: String(page?.path ?? ''), title: String(page?.title ?? ''), text: String(page?.text ?? '') },
  });
}
