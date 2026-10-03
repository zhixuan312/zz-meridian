import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream, type LanguageModel, type UIMessage } from 'ai';
import { systemPrompt, type PageContext } from './prompt';

/** The most model steps one reply may take. */
const MAX_STEPS = 8;

/** Streams the model's answer to `messages`, about `page`, as a UI message stream response. */
export async function respond({ model, secret, messages, page }: { model: LanguageModel; secret: string; messages: UIMessage[]; page: PageContext }): Promise<Response> {
  const modelMessages = await convertToModelMessages(messages);
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const result = streamText({
        model,
        system: systemPrompt(page),
        messages: modelMessages,
        experimental_toolApprovalSecret: secret,
        stopWhen: isStepCount(MAX_STEPS),
      });
      writer.merge(toUIMessageStream({ stream: result.stream }));
    },
    onError: (error) => (error instanceof Error ? error.message : 'The assistant could not answer.'),
  });
  return createUIMessageStreamResponse({ stream });
}
