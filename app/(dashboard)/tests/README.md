# Tests

What ran against each release: every verification run with its verdict, how long it took, when it started and, for a failed one, why, with a way to its release and to the requests of its endpoint.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker, "Tests", one sentence. No button: the page changes nothing | One band | Stacked |
| 1 | Three metric tiles: Latest runs, Failing now, Skipped now, each counting every run whatever the filters show | Three across | Stacked |
| 2 | One caption line naming the release, with a link to all runs, only when the address carries a release | Full width | Full width |
| 3 | Data table with its Filter bar (search, Verdict, and Runs: all of them, or the latest of each verification, which is what the tiles count): Verification with its endpoint, Release with its service, environment and commit (once the table is wider than 672px), Verdict, Duration (wider than 896px), Started, Why it failed (wider than 896px) | Columns | Cards: verification and verdict, release, duration ("Not run" for a skipped run) and "Started …" |

The body (rows 1 to 3, under the masthead) is the records template, `Records` from `src/components/templates/records`. The masthead is drawn by the server page, because nothing on it shares state with the body.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the template's skeleton, three tiles over a table with its filters |
| Default | Every run, the most recently started first; the filters live in the address |
| Filtered | Only the runs that match, and "n of m" in the Filter bar; the tiles keep counting every run |
| One release | The caption "Runs of v4.18.2" and only that release's runs, reached from the Releases page |
| No matches | The table's filtered-empty state with Clear filters |
| No runs | The table's first-run empty state |
| Release unavailable | A run that names no release the page has says "Unavailable" in the table and "Release unavailable" on a card, in place of a version |
| Failed read | The route's error screen; nothing is shown that was not read |

## Data

The runs come from `readRuns` (`src/data/engineering.ts`), read on every request through the `tests` collection, the same read the assistant's tool uses. Each run carries the version, service, environment and commit of the release it names, joined on the server; the run itself stores only its own eight fields. The latest run of a verification is the one that started last for its release, suite and endpoint, worked out by `latestRuns` in `src/data/verification.ts`, which the tiles and the assistant share.

The page has no action, no server action and no control that reruns anything: the sample records what ran and does not run it.

## Surfaces

- **Console**: as above. **Mobile**: cards of text; a run's links to its release and to its endpoint's requests are in the table, from tablet width up, because a link one line of caption high is no target for a thumb. **Embed**: not offered.

## Agents

An agent reads the page through the tests view tool and may look runs up through the `tests` collection tools; it cannot create or change a run. The page shares its context through `testsContext` in `src/views/tests-context.ts`.

### What the agent reads

The three counts, labelled "Latest runs", "Failing now" and "Skipped now", of every run in the workspace; the list the person has filtered to (the context says when it is the latest run of each verification only), with each run's id, suite, endpoint, release, verdict, failure and age, capped at ten; and the latest runs that are failing, with why.

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view; an MCP server can return this context as a tool's text (`docs/agents.md`).

## Content

- A verdict is one word: Passed, Failed or Skipped.
- A skipped run shows "Not run" in place of a duration.
- The copy never offers to rerun, retry or approve anything.
