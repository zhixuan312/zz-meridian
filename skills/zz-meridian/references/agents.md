# Agents

The rules for an agent in a Meridian product, as a guide for whoever builds it. Paths marked `example:` or `optional:` are in the template or in some projects only.

How a Meridian dashboard works with an agent: an AI assistant that reads the dashboard and acts on it through tools, under five rules, each enforced by a part of the system.

Agents work in two places: an MCP host, a chat where the dashboard appears as an MCP App, and the console's own assistant, one panel in the dashboard shell that reads the page the person is on (`example:docs/assistant.md`). The agent gets no separate interface. It uses the same views a person does.

## The model

A person asks the agent something in a chat ("how is the API doing this month?"). The agent calls a tool on the product's MCP server (`zz_meridian_overview { period: "30d" }`). The tool returns data and names a `ui://` resource; the host renders that resource, which is one of this template's `app/embed/*` routes, in a sandboxed frame beside the answer. From then on there are two operators on one view: the person points, taps and asks; the agent reads what the view shares and proposes what to do.

```
person ──asks──▶ agent ──calls tool──▶ MCP server ──returns ui:// view──▶ host frames it
   ▲                                                                      │
   └──────────── points, taps, presses Ask or Approve ◀──────── Meridian view
```

## The five rules

### 1. Addressable

Every view's state lives in its address: the period, the filters, the sort, the page, the selected record. Console routes read it from query parameters; embed routes take the same names as tool arguments. An agent never navigates by clicking: it opens exactly the view it means. A person can paste the link of any view into the chat and the agent can open the same thing.

**In the system:** `PeriodSelect` writes `?period=`; `DataTable`'s query-state hook writes `?q=&sort=&page=`; embed pages read `searchParams`.

### 2. Legible

Every embed view tells the model what is on screen, as one plain sentence and as structured facts, and tells it again when that changes: a filter, the period, the day the Meridian points at. "Why did this spike?" then has a referent, and the agent answers about the day the person is looking at, not the one it guessed.

**In the system:** `useShareView(text, structured)` sends `ui/update-model-context`, debounced, only when a host is connected. The sentence is written for a model: figures with units, the period named, nothing implied by layout.

### 3. Consent

An agent may read anything the person may read. It changes nothing without the person. Every write the agent wants arrives as a **Proposal**: what will change, from what to what, why (with the evidence it used), and what else it touches. Approve runs it once; Dismiss closes it. The person can always see the before and the after before agreeing.

A removal (revoke, delete) is proposed like any other change: the Proposal is marked critical, says what will be removed, and runs only when the person approves it. In the console's assistant the approval is signed by the server, so a forged one never runs. What only a page may do stays off every agent's reach (`pageOnly` in `example:docs/assistant.md`).

**In the system:** `Proposal` (pending, applying, applied, dismissed, failed, expired); `optional:app/embed/proposal` shows one end to end in a host; the assistant panel draws the same card in its thread.

### 4. Provenance

Whatever an agent did stays marked. An activity line names the agent and the person it acted for ("Claude raised the rate limit for Parallax AI · for Jonas Weber"). A filter or a view an agent set says so ("Set by Claude") until a person changes it. Agents are drawn as a square mark, never as a round avatar: a reader tells a person from an agent at a glance.

**In the system:** `AgentMark`, `ActivityFeed`'s `via`, `FilterBar`'s `setBy`.

### 5. Handoff

A person hands any card to the agent with one press. **Ask** posts a question about exactly what the card shows into the conversation, as the person, so the thread reads naturally. It appears only where an agent is listening; the console never shows a control that does nothing.

**In the system:** `AskAbout` (renders nothing unless `useSurface().ask` exists).

## Writing for the model

- Name the period and the unit every time: "2.94M requests in the last 30 days", not "2.94M".
- Prefer facts to adjectives: "errors rose from 0.6% to 2.1% on 21 and 22 September", not "errors spiked".
- Share what the person can see, nothing more: a hidden column is not context.
- Keep the structured part flat and stable: `{ view, period, day, filters }`. The model will compare it across turns.

## The console's own assistant

The second place is inside the product. The assistant panel reads the page the person is on, looks records up through the product's collections (`optional:src/data/collections.ts`) and proposes changes as Proposals in its thread. It follows the same rules: it reads what the person may read, changes nothing without approval, and leaves its mark (the Agent mark and the "Assistant" caption). It is off until a model is configured. `example:docs/assistant.md` says how to switch it on and point it at your data, and how the same tools can later be offered from an MCP server.

## Building an MCP server for the template

The template ships the views; the server is yours. For each embed route:

1. Register a resource `ui://zz-meridian/<view>` with `mimeType: "text/html;profile=mcp-app"`. Its content is the built HTML of the route (or a small HTML document that loads it from your deployment, allowed by the resource's CSP).
2. Register a tool whose `_meta.ui.resourceUri` names that resource and whose input schema uses the view's address parameters (`period`, `status`, `route`).
3. Return the data the view needs as the tool's result, so the view can render without a second round trip.

The view's side is already done: `EmbedSurface` performs `ui/initialize`, applies the host's theme and style variables, reports its height, and exposes `expand`, `ask`, `share` and `openLink` through `useSurface()`. To use the official SDK instead of the built-in bridge, replace `src/lib/host.ts` with `@modelcontextprotocol/ext-apps`; no component changes. `src/lib/host.ts` is a managed file, so list it in `optional:.meridian/keep.json` (see `update.md`, "Keeping a file on purpose") or every update stages it as a conflict.
