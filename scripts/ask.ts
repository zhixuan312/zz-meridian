/**
 * Ask a served product's assistant the questions its page specifications list.
 *
 *   node scripts/ask.ts --base <url> [--view <name>] [--as <persona>]
 *
 * Each page specification lists, under `### What the agent does here`, the questions a person on that page asks that
 * its context does not answer alone (FR-42). This asks each of them, one thread a question, of `POST /api/assistant` on
 * the page's own address, signed in as a persona of `scripts/verify.config.ts`: the one `--as` names, else the one keyed
 * `owner`, else the first declared. A detail page's questions are asked on its first record: the first link of its
 * form on its listing page. Every view with questions is asked, or the one `--view` names.
 *
 * For each view it writes `out/asks/<view>.md`: each question, every tool the assistant called with its input and what
 * the tool returned, and the answer's text, for a reader to judge whether the answer is the tools' (AC-14.8).
 *
 * It reads no environment. Whether the assistant is on is the served product's to say: `POST /api/assistant` answers
 * 404 while it is off, and the script then prints one line saying it did not run, and exits 0, as it does when the
 * configuration declares no persona. Neither `pnpm verify` nor `pnpm verify --full` runs it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { agentSection, pageSpecs, viewToolPages } from './lib/routes.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

/** The questions a page specification lists under `### What the agent does here`, in order; none without the section. */
export function questionsOf(md: string): string[] {
  return agentSection(md)?.questions.map((q) => q.question) ?? [];
}

type Personas = Record<string, { cookie: { name: string; value: string } }>;

/**
 * Who the questions are asked as: the persona `as` names, else the one keyed `owner`, else the first declared, as the
 * `Cookie` header that signs a request in. A configuration that declares none, or no persona of that name, does not run.
 */
export function personaFor(config: { personas?: Personas }, as?: string): { run: true; persona: string; cookie: string } | { run: false; why: string } {
  const names = Object.keys(config.personas ?? {});
  if (!names.length) return { run: false, why: 'scripts/verify.config.ts declares no personas to ask as' };
  const persona = as ?? (names.includes('owner') ? 'owner' : names[0]);
  const found = config.personas![persona];
  if (!found) return { run: false, why: `no persona named ${persona}; scripts/verify.config.ts declares ${names.join(', ')}` };
  return { run: true, persona, cookie: `${found.cookie.name}=${found.cookie.value}` };
}

/** A view whose specification lists questions, and the page they are asked on. */
type View = { name: string; page: string; title: string; questions: string[] };

/**
 * Every view whose specification lists questions. A view is named as its tool in `src/views/tools.ts` names it, and
 * without a tool by its page's folder: `(home)` is `home`, a detail page's `[id]` the folder before it.
 */
function views(): View[] {
  const tools = viewToolPages() ?? [];
  return pageSpecs().flatMap(({ file, route }) => {
    const md = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const questions = questionsOf(md);
    if (!questions.length) return [];
    const folders = path.posix.dirname(file).split('/');
    const folder = folders.at(-1)!.startsWith('[') ? folders.at(-2)! : folders.at(-1)!;
    const name = tools.find((t) => t.page === route)?.name ?? folder.replace(/[()]/g, '');
    const title = /^# (.+)$/m.exec(md)?.[1] ?? name;
    return [{ name, page: route, title, questions }];
  });
}

/** What the assistant did for one question: the tools it called, in order, and its answer. */
type Asked = { question: string; status: number; tools: { name: string; input: unknown; output?: unknown; error?: string }[]; answer: string; errors: string[] };

/** Ask one question of `address` in a thread of its own, and read the UI message stream the route answers. */
async function ask(base: string, cookie: string, address: string, title: string, question: string, n: number): Promise<Asked> {
  const body = { messages: [{ id: `ask-${n}`, role: 'user', parts: [{ type: 'text', text: question }] }], page: { path: address, title, context: '', text: '' } };
  const res = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body), signal: AbortSignal.timeout(300_000) });
  const asked: Asked = { question, status: res.status, tools: [], answer: '', errors: [] };
  if (!res.ok) { asked.errors.push(`POST /api/assistant answered ${res.status}`); return asked; }
  const calls = new Map<string, Asked['tools'][number]>();
  let block: string | undefined;
  for (const line of (await res.text()).split('\n')) {
    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
    let part: { type?: string; id?: string; toolCallId?: string; toolName?: string; input?: unknown; output?: unknown; delta?: string; errorText?: string };
    try { part = JSON.parse(line.slice(6)); } catch { continue; }
    if (part.type === 'tool-input-available' && part.toolCallId) {
      const call = { name: String(part.toolName), input: part.input };
      calls.set(part.toolCallId, call);
      asked.tools.push(call);
    } else if (part.type === 'tool-output-available' && part.toolCallId) {
      const call = calls.get(part.toolCallId);
      if (call) call.output = part.output;
    } else if (part.type === 'tool-output-error' && part.toolCallId) {
      const call = calls.get(part.toolCallId);
      if (call) call.error = String(part.errorText);
    } else if (part.type === 'text-delta') {
      // A reply written in more than one block (a step before a tool call and one after) keeps them apart.
      if (block !== undefined && part.id !== block && asked.answer) asked.answer += '\n\n';
      block = part.id;
      asked.answer += part.delta ?? '';
    } else if (part.type === 'error') asked.errors.push(String(part.errorText));
  }
  return asked;
}

/** `body` in a fence longer than any run of backticks inside it. */
function fenced(lang: string, body: string): string {
  const fence = '`'.repeat(Math.max(3, ...[...body.matchAll(/`+/g)].map((m) => m[0].length + 1)));
  return `${fence}${lang}\n${body}\n${fence}`;
}

/**
 * What a tool returned, as a reader reads it: a view's context and a prepared query's answer are text the model was
 * handed, so they are shown as text under the address they came from; anything else as JSON.
 */
function returned(output: unknown): string {
  const o = output as { address?: unknown; context?: unknown; answer?: unknown } | null;
  const text = typeof o?.answer === 'string' ? o.answer : typeof o?.context === 'string' ? o.context : typeof output === 'string' ? output : null;
  if (text === null) return `:\n\n${fenced('json', JSON.stringify(output, null, 2))}`;
  return `${typeof o?.address === 'string' ? `, from ${o.address}` : ''}:\n\n${fenced('text', text)}`;
}

/** The markdown of one view's questions, as `out/asks/<view>.md` holds it. */
function report(view: View, address: string, persona: string, base: string, asked: Asked[]): string {
  const out = [`# ${view.title}: what the agent does here`, '', `Asked of ${base}${address} as ${persona}, ${new Date().toISOString()}.`];
  asked.forEach((a, i) => {
    out.push('', `## ${i + 1}. ${a.question}`, '');
    if (!a.tools.length) out.push('No tool was called.', '');
    for (const t of a.tools) {
      out.push(`Tool \`${t.name}\`, asked:`, '', fenced('json', JSON.stringify(t.input ?? {})), '');
      if (t.error !== undefined) out.push('It failed:', '', fenced('text', t.error), '');
      else if (t.output !== undefined) out.push(`It returned${returned(t.output)}`, '');
    }
    for (const e of a.errors) out.push(`Error: ${e}`, '');
    out.push('Answer:', '', a.answer || '(no answer)');
  });
  return `${out.join('\n')}\n`;
}

/** The address a page's questions are asked on: the page itself, or for a detail page the first record its listing page links. */
async function addressOf(base: string, cookie: string, page: string): Promise<string | null> {
  if (!/\[[^\]/]+\]/.test(page)) return page;
  const listing = page.split('/[')[0] || '/';
  const form = page.split('/').map((s) => (/^\[[^\]/]+\]$/.test(s) ? `[^/"'?#\\s<>]+` : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/');
  const html = await (await fetch(`${base}${listing}`, { headers: { cookie }, signal: AbortSignal.timeout(60_000) })).text();
  return new RegExp(`href="(${form})(?:[?#][^"]*)?"`).exec(html)?.[1] ?? null;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const arg = (flag: string) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  const base = arg('--base')?.replace(/\/+$/, '');
  if (!base || !/^https?:\/\//.test(base)) { console.error('usage: node scripts/ask.ts --base <url> [--view <name>] [--as <persona>]'); return 1; }
  const want = arg('--view'), as = arg('--as');

  const config = ((await import(pathToFileURL(path.join(ROOT, 'scripts/verify.config.ts')).href)) as { default: { personas?: Personas } }).default;
  const declared = Object.keys(config.personas ?? {});
  const who = personaFor(config, as);
  if (!who.run) {
    // No persona at all is a project that has none to ask as; a name it does not declare is a mistake in the command.
    console.log(`ask: did not run: ${who.why}`);
    return declared.length ? 1 : 0;
  }
  const all = views();
  const chosen = want === undefined ? all : all.filter((v) => v.name === want);
  if (!chosen.length) {
    console.error(want === undefined ? 'ask: no page specification lists a question under "### What the agent does here"' : `ask: no view named ${want} lists questions; these do: ${all.map((v) => v.name).join(', ')}`);
    return 1;
  }

  // Whether the assistant is on, asked with no message: 404 is off; 400, the route refusing the empty thread, or an
  // answer is on. The persona's cookie goes with it, because the route answers 401 to nobody before it says whether it is on.
  let probe: number;
  try {
    probe = (await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: who.cookie }, body: '{"messages":[]}', signal: AbortSignal.timeout(60_000) })).status;
  } catch (e) {
    console.error(`ask: did not run: ${base} could not be reached (${(e as Error).message})`);
    return 1;
  }
  if (probe === 404) { console.log(`ask: did not run: the assistant is off at ${base} (POST /api/assistant answered 404)`); return 0; }
  if (probe !== 400 && (probe < 200 || probe > 299)) { console.error(`ask: did not run: POST /api/assistant answered ${probe} as ${who.persona}`); return 1; }

  let failed = false;
  fs.mkdirSync(path.join(ROOT, 'out/asks'), { recursive: true });
  for (const view of chosen) {
    const address = await addressOf(base, who.cookie, view.page);
    if (!address) {
      console.error(`ask: ${view.name}: no link of the form ${view.page} on ${view.page.split('/[')[0] || '/'}, so its questions were not asked`);
      failed = true;
      continue;
    }
    const asked: Asked[] = [];
    // One at a time, in the specification's order: each in a thread of its own, so no answer leans on another's.
    // A question that times out or loses its connection is written as such, and the rest are still asked.
    for (const [i, q] of view.questions.entries()) {
      asked.push(await ask(base, who.cookie, address, view.title, q, i + 1).catch((e: unknown) => ({ question: q, status: 0, tools: [], answer: '', errors: [(e as Error).message] })));
    }
    const file = `out/asks/${view.name}.md`;
    fs.writeFileSync(path.join(ROOT, file), report(view, address, who.persona, base, asked));
    const tools = asked.reduce((n, a) => n + a.tools.length, 0);
    const unanswered = asked.filter((a) => a.errors.length || !a.answer).length;
    if (unanswered) failed = true;
    console.log(`${file}: ${asked.length} questions on ${address} as ${who.persona}, ${tools} tool calls${unanswered ? `, ${unanswered} not answered` : ''}`);
  }
  return failed ? 1 : 0;
}

if (import.meta.main) process.exitCode = await main();
