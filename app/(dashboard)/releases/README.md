# Releases

What is live in each environment, what is ready to go out and what is still in testing, and for a release in testing which required verification is missing, failed or skipped.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker, "Releases", one sentence. No button: the page changes nothing | One band | Stacked |
| 1 | Three metric tiles: Live versions, Ready to release, In testing, each counting every release whatever the filters show | Three across | Stacked |
| 2 | Data table with its Filter bar (search, State, Environment): Release with its service and environment and a Live mark on the version that is out, State, Verification (once the table is wider than 672px), Commit (wider than 896px), Released or changed | Columns | Cards: release and state, verification and "Released …" or "Changed …" |

The body (rows 1 and 2, under the masthead) is the records template, `Records` from `src/components/templates/records`. The masthead is drawn by the server page, because nothing on it shares state with the body.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the template's skeleton, three tiles over a table with its filters |
| Default | Every release, the most recently released or changed first; the filters live in the address |
| Filtered | Only the releases that match, and "n of m" in the Filter bar; the tiles keep counting every release |
| In testing | The state "In testing", "1 of 2 passed" and one line for each verification still unresolved, such as "load on POST /v1/messages: no run yet" |
| Ready | The state "Ready to release": every required verification passed and the release has not gone out |
| Released | The state "Released"; the version released last for its service and environment also carries Live |
| No matches | The table's filtered-empty state with Clear filters |
| No releases | The table's first-run empty state |
| Failed read | The route's error screen; nothing is shown that was not read |

## Data

The releases come from `readReleases` (`src/data/engineering.ts`), read on every request through the `releases` collection, the same read the assistant's tool uses. Each release carries what its required verifications come to against every run, worked out by `verificationOf` in `src/data/verification.ts`: a required verification with no run reads as waiting for it, never as passed, and only the latest run of each counts. The live version of a service and environment is `currentVersions` in the same module.

The page has no action, no server action and no control that deploys, publishes or rolls back: the sample records where each release stands and does not move it.

## Surfaces

- **Console**: as above. **Mobile**: cards. **Embed**: not offered.

## Agents

An agent reads the page through the releases view tool and may look releases up through the `releases` collection tools; it cannot create or change a release. The page shares its context through `releasesContext` in `src/views/releases-context.ts`.

### What the agent reads

The three counts, labelled "Live versions", "Ready to release" and "In testing", of every release in the workspace; the live version of each service and environment; the list the person has filtered to, with each release's id, service, environment, state, verifications passed and commit, capped at ten; and, for the releases in testing, what each still waits for.

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view; an MCP server can return this context as a tool's text (`docs/agents.md`).

## Content

- A state is named in the product's words: In testing, Ready to release, Released.
- A required verification that has not run reads "no run yet", never as passed.
- The copy never offers to deploy, publish or roll back anything.
