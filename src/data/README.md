# Data

Your product's data seam: the only place pages read data from. Put your types and your queries here (`src/data/<product>.ts`), and import them from your pages and views.

- Until your API is wired, return deterministic sample data: a seeded generator and a fixed clock, never `Math.random()` or `new Date()` in render, or the server and the client disagree and React reports a hydration error.
- Give anything a tile or a chart shows over time one value per day: the Meridian cursor reads it.
- Read freshness from when the data arrived, never from now.
- Return `null` for "not measured"; the formatters in `src/lib/format.ts` render it as a dash.
- Shape records to the types the patterns define (`ActivityEvent` in the activity feed, `Incident` in the incident card, `Service` in the status list), so they render without adapters.

The template's own sample product, Relay, is not here: it lives in `src/system/fixtures/`, because the Design Atlas and every card preview read it. Leave it in place, and point your pages at your own module instead.
