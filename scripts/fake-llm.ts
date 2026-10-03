/**
 * An OpenAI-compatible fake LLM for tests and local runs. It never touches the network.
 *
 *   node scripts/fake-llm.ts --port <n>     (--port 0 picks a free port)
 *
 * or, from a test: `const llm = await startFakeLlm({ port: 0 })` -> { url, requests, close }.
 *
 * POST <url>/chat/completions answers in the chat-completions format (streamed as server-sent events when the body has
 * `stream: true`). GET <url>/requests returns every recorded request body as JSON.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { pathToFileURL } from 'node:url';

type Message = { role?: string; content?: unknown };

/** The scripted reply for a request. Later phases add their cases here. */
function script(body: { messages?: Message[] }): { text: string } {
  const system = (body.messages ?? []).find((m) => m.role === 'system');
  const content = typeof system?.content === 'string' ? system.content : '';
  const title = /Page: (.+?) \(/.exec(content)?.[1];
  return { text: title ? `This is the ${title} page.` : 'Hello.' };
}

function completion(body: { model?: string }, reply: { text: string }) {
  const base = { id: 'chatcmpl-fake', created: Math.floor(Date.now() / 1000), model: body.model ?? 'fake-model' };
  const usage = { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 };
  return { base, usage, reply };
}

function send(res: http.ServerResponse, status: number, json: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(json));
}

export async function startFakeLlm({ port }: { port: number }) {
  const requests: any[] = [];

  const server = http.createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0];

    if (req.method === 'GET' && path === '/v1/requests') return send(res, 200, requests);
    if (req.method !== 'POST' || path !== '/v1/chat/completions') return send(res, 404, { error: { message: `no route for ${req.method} ${path}` } });

    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      let body: any;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
      } catch {
        return send(res, 400, { error: { message: 'the request body is not valid JSON' } });
      }
      requests.push(body);

      const { base, usage, reply } = completion(body, script(body));
      if (body.stream !== true) {
        return send(res, 200, {
          ...base,
          object: 'chat.completion',
          choices: [{ index: 0, message: { role: 'assistant', content: reply.text }, finish_reason: 'stop' }],
          usage,
        });
      }

      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      const emit = (delta: object, finish_reason: string | null, extra: object = {}) =>
        res.write(`data: ${JSON.stringify({ ...base, object: 'chat.completion.chunk', choices: [{ index: 0, delta, finish_reason }], ...extra })}\n\n`);
      emit({ role: 'assistant', content: '' }, null);
      emit({ content: reply.text }, null);
      emit({}, 'stop', { usage });
      res.write('data: [DONE]\n\n');
      res.end();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;

  return {
    url,
    requests,
    close: () => new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--port');
  const port = i >= 0 ? Number(process.argv[i + 1]) : 0;
  if (!Number.isInteger(port) || port < 0) { console.error('usage: node scripts/fake-llm.ts --port <n>'); process.exit(1); }
  const llm = await startFakeLlm({ port });
  console.log(`fake-llm listening on ${llm.url}`);
}
