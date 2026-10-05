import { APICallError, RetryError, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream, type LanguageModel, type UIMessage } from 'ai';
import type { AnyCollection } from '@/lib/collection';
import { ChangeRefused, assistantTools } from './tools';
import { readBrief } from './brief';
import { briefExcerpt, systemPrompt, type PageContext } from './prompt';

/** The most model steps one reply may take. */
const MAX_STEPS = 8;

/** Streams the model's answer to `messages`, about `page`, as a UI message stream response. */
export async function respond({ model, secret, messages, page, collections, now }: { model: LanguageModel; secret: string; messages: UIMessage[]; page: PageContext; collections: AnyCollection[]; now: Date }): Promise<Response> {
  const modelMessages = await convertToModelMessages(messages);
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const { tools, toolApproval } = assistantTools(collections, writer);
      const result = streamText({
        model,
        system: systemPrompt(page, now, briefExcerpt(readBrief())),
        tools,
        toolApproval,
        messages: modelMessages,
        experimental_toolApprovalSecret: secret,
        stopWhen: isStepCount(MAX_STEPS),
      });
      writer.merge(toUIMessageStream({ stream: result.stream, onError: plainError }));
    },
    onError: plainError,
  });
  return createUIMessageStreamResponse({ stream });
}

/**
 * A refused change says why. Anything else is logged on the server and becomes one of three plain sentences, never
 * anything from the error itself.
 */
function plainError(error: unknown): string {
  if (error instanceof ChangeRefused) return error.message;
  console.error('assistant: model call failed', error);
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  const status = APICallError.isInstance(cause) ? cause.statusCode : undefined;
  if (status === 401 || status === 403) return 'The assistant is not set up correctly: its provider refused the key. Ask whoever runs this console.';
  if (status === 429) return "The assistant's provider is busy. Try again in a minute.";
  return 'The assistant could not reach its provider. Try again.';
}
