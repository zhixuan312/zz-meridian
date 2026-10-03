# Data

Your product's data seam: the only place pages, actions and the assistant read data from. `collections.ts` lists your collections: one description of each set of records, with what may be created, changed and removed, read by the pages, changed by their server actions and offered to the assistant as tools (`docs/assistant.md`). Put other types and queries beside it (`src/data/<product>.ts`), and import them from your pages and views.

- Until your API is wired, return deterministic sample data: a seeded generator and a fixed clock, never `Math.random()` or `new Date()` in render, or the server and the client disagree and React reports a hydration error.
- Give anything a tile or a chart shows over time one value per day: the Meridian cursor reads it.
- Read freshness from when the data arrived, never from now.
- Return `null` for "not measured"; the formatters in `src/lib/format.ts` render it as a dash.
- Shape records to the types the patterns define (`ActivityEvent` in the activity feed, `Incident` in the incident card, `Service` in the status list), so they render without adapters.

The template's own sample, ZZ Meridian's own dashboard, lives in `src/system/fixtures/`, because the Design Atlas and every card preview read it; `collections.ts` serves it as each collection's `rows`. Leave it in place, and replace each `rows` with your API and `clock` with `new Date()`.
