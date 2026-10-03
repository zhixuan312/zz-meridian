# 0008 · An assistant in the console

Date: 2026-10-04 · Status: accepted

## Context

Agents reached a Meridian dashboard only through an MCP host (decision 0004): the person had to leave the product, open a chat client and ask there. A person already on a console page had no one to ask what a figure meant, and no way to say "suspend this member" without finding the row. A product team also had no one place where its data was described, so a second operator would have meant a second data layer.

## Decision

- The console has its own operator beside the MCP host: an assistant panel on every console page. It reads the page the person is on and answers; it looks up records and proposes changes. It is on only when `ASSISTANT_PROVIDER`, `ASSISTANT_API_KEY`, `ASSISTANT_MODEL` and, where needed, `ASSISTANT_BASE_URL` are set, read on every request.
- One data layer. A `Collection` (`src/lib/collection.ts`) describes a set of records once; `src/data/collections.ts` lists them. Pages, server actions and the assistant read and change records through it, and an MCP server can offer the same tools later. `pageOnly` and `hidden` keep what only a page may do or see out of every tool.
- Approvals are signed. Every add, change and removal shows a Proposal made by the server and waits for the person. The approval is signed with a secret derived from the provider key, so a forged one never runs. A removal is proposed like any other change, marked critical, and runs only when approved. This replaces the earlier rule that destructive changes are never proposed inline.
- The thread is kept in the person's browser, nowhere else, and the person can switch the assistant off in Settings.

## Consequences

- A product team switches the assistant on with four variables and points it at its data in one file.
- The sign-in check belongs in three places: the dashboard layout, the assistant route and every server action, because an action is a public endpoint the layout does not guard; the template marks each.
- A person editing their own browser storage can re-approve a card that expired. This is accepted: the approval is the server's own, for a change they were shown, and they could make the same change on the page.
- Each question costs up to 8 model calls with the page text and the thread in each; the person can clear the thread.
- Breaking: `docs/agents.md` and `docs/surfaces.md` no longer say a destructive change is never proposed; a product that relied on that must keep removals off an agent's reach with `pageOnly`.
