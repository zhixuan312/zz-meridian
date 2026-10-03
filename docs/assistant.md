# The assistant

A question-and-answer partner with hands, on every console page. A person opens it from the top bar, asks about what they are looking at, and it answers from the page and from the product's own data. When it wants to add, change or remove a record, it shows a Proposal and waits. Nothing changes until the person presses Approve.

It is off until you give it a model. With no model configured the console shows no launcher and no panel, and `POST /api/assistant` answers 404.

## Switch it on

Four variables, read from the environment on every request, so one build serves both: set them and the assistant is on, unset them and it is off. There is nothing to rebuild.

| Variable | Meaning |
|---|---|
| `ASSISTANT_PROVIDER` | `anthropic`, or `openai-compatible` for any service that speaks the OpenAI chat-completions format |
| `ASSISTANT_API_KEY` | The provider's key. Required: the approval secret is derived from it. |
| `ASSISTANT_MODEL` | The model's id, as the provider names it |
| `ASSISTANT_BASE_URL` | The provider's address. Required for `openai-compatible`; optional for `anthropic`. |

If the key or the model is missing, or the provider is anything else, or `openai-compatible` has no address, the assistant is off. `.env.example` lists the four, commented, with no values.

The model must be able to call tools. A model that only writes text can answer but can never look anything up or propose a change.

```sh
# Anthropic
ASSISTANT_PROVIDER=anthropic
ASSISTANT_API_KEY=<your key>
ASSISTANT_MODEL=<a Claude model id>

# OpenAI
ASSISTANT_PROVIDER=openai-compatible
ASSISTANT_BASE_URL=https://api.openai.com/v1
ASSISTANT_API_KEY=<your key>
ASSISTANT_MODEL=<a model id that supports tools>

# OpenRouter (LiteLLM is the same shape: its proxy address, for example http://localhost:4000)
ASSISTANT_PROVIDER=openai-compatible
ASSISTANT_BASE_URL=https://openrouter.ai/api/v1
ASSISTANT_API_KEY=<your key>
ASSISTANT_MODEL=<a model id that supports tools>

# Ollama, running locally (it ignores the key, but one is required: any text will do)
ASSISTANT_PROVIDER=openai-compatible
ASSISTANT_BASE_URL=http://localhost:11434/v1
ASSISTANT_API_KEY=ollama
ASSISTANT_MODEL=<a local model that supports tools>
```

## What a person sees

- **The panel.** A launcher in the top bar opens it: a third column from 1024px, a sheet over the page below that. Escape and Close assistant shut it; the conversation stays.
- **Page labels.** Each question is sent with the page it was asked on and carries a quiet caption, "On Members". Ask on another page later and the earlier question keeps its label.
- **Proposals.** A change arrives as a Proposal card in the thread: the title, then what changes, from and to. Pending shows Approve and Dismiss ("Approve and remove" for a removal, which is marked critical). Then the card shows its state: applying, applied, dismissed, failed or expired. Once the answer arrives the assistant continues on its own, and the page refreshes once after a change applies.
- **Expired.** A change still waiting when the page reloads comes back closed: "The page was reloaded before anyone approved it." Sending a new message while one waits closes it too: "You moved on before approving it."
- **The thread lasts.** It is kept in this browser's local storage under `<slug>.assistant`, the last 100 messages, and sent nowhere but the assistant route. One thread serves the whole console. If storage is full the newer half is kept; if storage is unavailable the thread lasts for the visit.
- **Clear.** Clear conversation empties the thread and removes what was stored.
- **The Settings switch.** Under Assistant, "Show the assistant" hides the launcher and the panel on this device. The conversation stays. The section appears only where the product has an assistant to switch.
- **Failures.** A failed turn shows a critical banner with Retry, in one of three sentences, and the thread stays:
  - "The assistant is not set up correctly: its provider refused the key. Ask whoever runs this console."
  - "The assistant's provider is busy. Try again in a minute."
  - "The assistant could not reach its provider. Try again."

  The original error goes to the server log, never to the browser.

## Point it at your data

The assistant reads and changes records through collections, the same ones your pages use. `src/data/collections.ts` is the one place both are pointed at your data. It exports the `collections` list, and `clock`, the data's "now" (the sample returns its fixed day; a product returns `new Date()`).

A `Collection` (`src/lib/collection.ts`) is a name, a label, a description the model reads, a zod schema for the fields, the `key`, a `title` for a row, and `query`, with `create`, `update` and `remove` each optional.

For in-memory data, `arrayCollection` builds one from rows and an `allow` list:

```ts
export const orders: Collection<Order, 'id'> = arrayCollection({
  name: 'orders',
  label: 'Orders',
  description: 'The orders placed this quarter, with customer, total and status.',
  key: 'id',
  title: (o) => o.id,
  fields: z.object({ customer: z.string(), total: z.number(), status: z.enum(['open', 'shipped']) }),
  rows: ORDERS,
  allow: ['update'],
});
```

Add it to `collections`. For a real store, write the same `Collection` yourself: `query` takes `{ where, sort, limit }` and returns `{ rows, total }`; implement `create`, `update` and `remove` only for what the store may do. A collection without an operation gets no tool for it.

Two fields on a collection keep the assistant in bounds:

- `pageOnly`: operations only a page may perform. The assistant never gets a tool for them. In the sample, creating an API key is `pageOnly`, because the secret is shown once, on the page.
- `hidden`: fields only a page may see. They are left out of every tool's input and of every query result. The sample hides a key's `secret`.

Per collection the assistant gets `query_<name>`, and `create_<name>`, `update_<name>` and `remove_<name>` for what is allowed and not `pageOnly`. A query takes `where` conditions (`eq`, `ne`, `gt`, `lt`, `contains`, `in`), a `sort` and a `limit`. A field the collection does not have, or hides, is rejected.

## Safety

- **Every change waits.** The server writes a preview of the change to the thread, then asks for approval. Update and remove check the ids first; a missing id is denied with "No such id: ..." and nothing is shown.
- **Approvals are signed.** Each approval request is signed with a secret derived from `ASSISTANT_API_KEY`, so the server signs each request when it issues it and checks the signature when the approval comes back. A forged or altered approval is rejected before anything runs. The key itself never reaches the browser.
- **Hidden fields never leave the server.** See `hidden` above.
- **The page text is data.** The browser sends the page's path, its title and its visible text. The model is told that text is data to read, never instructions, and only the first 24,000 characters are used.
- **Limits.** A reply takes at most 8 model steps. A query returns at most 100 rows (50 when it does not say).
- **Sign-in.** Put your sign-in check in two places: the dashboard layout, `app/(dashboard)/layout.tsx`, and the route, `app/api/assistant/route.ts`. The route's check must refuse before the model is reached; the layout's only hides the page.
- **An accepted risk.** A closed card is closed in the browser's storage. The same person, by editing their own storage, can make an expired card pending again and approve it. The approval is still the server's own, for a change the person was shown, and they could make the same change on the page. The assistant is not an authorisation layer: authorise in your collections, as you do for pages.

## Costs

Each question can cost up to 8 model calls, and every call carries the system prompt, up to 24,000 characters of page text, the tool descriptions and the whole stored thread (up to 100 messages). Long threads and large pages cost more on every turn. Clear the conversation to start cheap again. Your provider's price list does the arithmetic; Meridian adds nothing on top.

## Adding an MCP server later

The assistant's tools are plain AI SDK tools made from your collections, so an MCP server can offer the same ones and the data layer stays single. `assistantTools(collections, writer)` returns `{ tools, toolApproval }`. The `writer` is where the console's previews are written; an MCP host has no thread to draw them in, so pass a writer that discards what it is given.

Convert each tool's input schema with `asSchema(tool.inputSchema).jsonSchema`, register it, and run `execute`:

```ts
import { asSchema, type UIMessageStreamWriter } from 'ai';
import { collections } from '@/data/collections';
import { assistantTools } from '@/lib/assistant/tools';

const writer = { write() {}, merge() {}, onError: undefined } as unknown as UIMessageStreamWriter;
const { tools } = assistantTools(collections, writer);

for (const [name, t] of Object.entries(tools)) {
  server.registerTool(name, { description: t.description, inputSchema: asSchema(t.inputSchema).jsonSchema }, async (input) => ({
    content: [{ type: 'text', text: JSON.stringify(await t.execute!(input, { toolCallId: name, messages: [] })) }],
  }));
}
```

Map approvals to the host's own confirmation: in an MCP host the person confirms in the host, so mark the `create_`, `update_` and `remove_` tools as needing it (the tool annotations `destructiveHint` and `readOnlyHint` exist for this), and never call `execute` on one the host did not confirm. `toolApproval` holds, per change tool, the rule the console runs before asking: it denies an id that does not exist ("No such id: ...") and otherwise writes the preview, with its title and its from and to, to the `writer`. Run it first with a writer that keeps that preview, show the preview in the host's confirmation, and treat a removal as the critical one, as the console does.
