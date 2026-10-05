/**
 * One process of the multi-process live test: `liveStream` over a file-backed collection, on a free port.
 *
 *   node scripts/fixtures/file-collection-server.ts --file <path>
 *
 * GET /live is the stream, GET /rows the rows now in the file, POST /write {"name": "..."} a write through this
 * process. It prints `listening on <port>` once it answers. Kept outside node_modules: Node does not strip types there.
 */
import http from 'node:http';
import { liveStream } from '../../src/data/live-stream.ts';
import { fileCollection } from './file-collection.ts';

const i = process.argv.indexOf('--file');
if (i < 0 || !process.argv[i + 1]) throw new Error('--file <path> is required');
const items = fileCollection(process.argv[i + 1]!);

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url?.startsWith('/live')) {
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    const response = liveStream({ names: ['items'], collections: [items], signal: abort.signal, authorize: async () => true });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    const reader = response.body!.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      res.end();
    }
    return;
  }
  if (req.method === 'GET' && req.url === '/rows') {
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify((await items.query({})).rows));
    return;
  }
  if (req.method === 'POST' && req.url === '/write') {
    let body = '';
    for await (const chunk of req) body += chunk;
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(await items.create!(JSON.parse(body))));
    return;
  }
  res.writeHead(404).end();
});
server.listen(0, '127.0.0.1', () => console.log(`listening on ${(server.address() as { port: number }).port}`));
