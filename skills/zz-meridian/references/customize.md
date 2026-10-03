# Customising a Meridian project

The order that keeps a build calm: data, navigation, pages, extras, clean-up. Read the files named here before changing
them; each starts with a comment that explains its job.

## Data: `src/data/`

`src/data/` is the product's own seam: pages and views import data from it and nowhere else. Write `src/data/<product>.ts`. The template's
sample, ZZ Meridian's own dashboard, lives in `src/system/fixtures/`; your pages never import it, but
`src/data/collections.ts` does, so it stays until each collection's `rows` come from your data (see "The assistant").

- **Types from the person's world.** Turn their schema, CSV headers or API into TypeScript types (`Order`, `Shipment`,
  `Invoice`). Name fields the way their team says them.
- **Deterministic sample data** until their API is wired: a seeded generator and a fixed clock (`DEMO_NOW`), never
  `Math.random()` or `new Date()` in render, or the server and the client disagree and React reports a hydration error
  (the audit fails on it).
- **Daily series** for anything a Metric tile or chart shows over time: the Meridian cursor reads one value per day.
- **Freshness** from when data arrived (`DEMO_UPDATED_AT`), never from now.
- **null for "not measured"**: the formatters in `src/lib/format.ts` render it as a dash. Add a formatter there when a
  quantity needs one (weight, distance), never inline; a chart names its format by key, so a new quantity a chart
  shows also gets a key in `NumberFormat`, `FORMATTERS` and `AXIS_FORMATTERS`. Money follows `app.currency`.
- **Helpers a server page calls** (summaries, derived sentences) go in `src/data/` or `src/lib/`, never in a
  `'use client'` view file: a server component cannot call a function exported from a client module.

## Navigation: `src/app.config.ts`

`app` holds the name, workspace, accent, timezone, currency and the signed-in user the rail shows (all set by
`scripts/brand.ts`); `slug`, `domain` and `toolPrefix` derive from the name. `nav` is the rail and the command
palette: groups of `{ href, label, icon }` (icons from `lucide-react`, 1.75 stroke is applied by the rail). A badge is a
short string, used only for something that needs attention ("1").

## Pages: presets to start from

| They need | Copy and adapt | Its protagonist |
|---|---|---|
| A summary with one leading figure | `app/(dashboard)/page.tsx` + `src/views/overview.tsx` | Featured metric with its trend |
| A list of records with filters | `app/(dashboard)/requests/` + `src/views/requests.tsx` | Data table with filter bar |
| One record | `app/(dashboard)/requests/[id]/` + `src/views/request.tsx` | Detail head and key facts |
| Breakdowns and patterns over time | `app/(dashboard)/analytics/` + `src/views/analytics.tsx` | Heatmap or the main chart |
| Systems and incidents | `app/(dashboard)/health/` + `src/views/health.tsx` | Status summary |
| Customers, accounts, people | `app/(dashboard)/customers/` + `src/views/customers.tsx` | Table with sparklines |
| Keys, tokens, secrets | `app/(dashboard)/keys/` + `src/views/keys.tsx` | Table with masked values |
| Records people add, edit and remove (also what the assistant reads) | `app/(dashboard)/members/`, `app/(dashboard)/keys/` + `src/views/members.tsx`, `src/views/keys.tsx` | Data table over a collection |
| Settings (a sample: keep only if asked; its Assistant section holds the assistant's switch) | `app/(dashboard)/settings/` + `src/views/settings.tsx` | Form sections |
| Sign in, not found | `app/sign-in/` (`page.tsx` + `panel.tsx`), `app/not-found.tsx` + `src/views/standalone.tsx` | One sentence at display size |

The health preset assumes software services. For other things that are up or not (warehouses, branches, sites), pass
`StatusList` a `noun`, a `measure` ("on time") and a `metric`, and `UptimeBars` a `measure`. A Metric tile says what
its change compares with in `compare` ("vs the 3 days before") and takes a `note` where no comparison fits.

Rules that make every page look like it belongs:

- **`PageFrame`** with `kicker` (where it sits: "Product · Workspace" or the parent record), `title`, one-sentence
  `description`, then `meta` (Freshness) and `actions` (one primary at most).
- **`Stack` of `Row`s.** Splits are `full`, `1/2`, `2/3`, `1/3` and `tiles`. Cards in a row are the same height; one card
  per cell (a column of tiles is fine in a 1/3 cell).
- **One protagonist.** At most one `FeaturedMetric` per page; everything else is a `MetricTile` or a `Card`.
- **Charts on one page share one `Meridian`** (wrap the rows in `<Meridian dates={...}>`), so pointing at a day reads it
  everywhere. Two measures of a different size are two charts, never one chart with two axes.
- **Tables**: mark one column `grow` (the lead), numbers `numeric`, low-value columns `hideBelow`; give `rowHref` so rows
  open their record. Below 768px a data table becomes a card list by itself.
- **Every state**: loading (`loading.tsx` with skeletons shaped like the page), empty (Empty state with the one action),
  error (`error.tsx`, what failed and Retry).
- **A page spec** next to each route (`README.md`: summary, Structure, States, Surfaces, Agents), so the next person, or
  agent, knows what the page is for. `node scripts/check.ts` requires Structure and States.

## The assistant

The dashboard carries an assistant panel (`src/components/patterns/assistant/`, mounted by `AppShell`). It is off until
the variables are set, read per request, so no rebuild is needed: `ASSISTANT_PROVIDER` (`anthropic` or
`openai-compatible`), `ASSISTANT_API_KEY` and `ASSISTANT_MODEL` are required, and `ASSISTANT_BASE_URL` is required for
`openai-compatible`. `docs/assistant.md` in the template has the full guide.

- **Collections** live in `src/data/collections.ts`: one `arrayCollection` per kind of record, with `rows`, the `fields`
  schema, `allow` (which of create, update and remove the assistant may propose) and `hidden` fields. Replace each
  `rows` with the person's API and `clock` with `new Date()`; the assistant reads and proposes changes only through them.
- **Sign-in check** goes in three places, the same check: `app/(dashboard)/layout.tsx`, `app/api/assistant/route.ts` and every server action (each `actions.ts`), because a server action is a public endpoint the layout does not guard
  (before the model is reached).
- **The switch** ("Show the assistant") is in `src/views/settings.tsx`. A product that deletes Settings moves it, or the
  person can no longer hide the panel.

## Brand beyond the accent

Logo: replace the SVG in `src/components/base/app-mark/index.tsx`, keeping the sizes (20, 24, 28, 32) and the empty alt.
Theme default: dark is on `:root`; to make light the default, set `"default": "light"` for the theme modifier in
`tokens/zz-meridian.resolver.json` and run `pnpm tokens`. Density: users pick it in the rail's appearance menu and the
command palette; compact suits operators who scan many rows.

## MCP App views (only if asked)

Each `app/embed/<view>/` route is an MCP App: a `ui://` resource an MCP server returns beside a tool result. Copy
`app/embed/overview/` for a summary or `app/embed/requests/` for a list; wrap the content in `EmbedFrame`; call
`useShareView(sentence, facts)` so the model knows what is on screen; put `AskAbout` on cards worth asking about; agent
writes go through `Proposal` (see `app/embed/proposal/`). Read `docs/agents.md` in the project for the server side.

## Clean-up before validation

Delete the sample pages, views and embed views the product does not use, with their nav lines. Do not delete
`src/system/fixtures/` or `src/system/sample-cells.tsx` yet: `src/data/collections.ts` and `app/(dashboard)/layout.tsx`
import the fixtures. Once your collections' `rows`, `clock` and the layout's `DEMO_NOW` and `ALERTS` come from your own
data and nothing imports them, delete them (with the Atlas kept, the previews read them: leave them, and remove the
pages' entries in `PAGES` in `src/system/content.ts`). Keep `src/data/collections.ts`, `src/lib/collection.ts`,
`src/lib/assistant/`, `app/api/assistant/` and the assistant panel, unless the person does not want the assistant (it
then stays off without them). Then fix what still points at the sample:

- `src/views/standalone.tsx`: the footer status line and its link to `/health`, and `app/not-found.tsx`'s "Check service
  health" link.
- `src/components/patterns/shell-tools/index.tsx`: the alerts count ("Alerts · 1 new") is sample copy.
- `app/sign-in/page.tsx`: the headline and lead describe the sample product.
- `src/system/content.ts`: `PAGES` names a sample request id route.
- Each page `README.md`: its States rows must describe what your view renders; `check.ts` only checks that the section
  exists.

This finds what is left:

```sh
grep -rn "/health\|/requests\|/customers\|/keys\|/settings\|fixtures/sample\|sample-cells" app src/views src/components \
  --include=*.tsx | grep -v preview.tsx
```

Then `node scripts/registry.ts` and `pnpm verify`.

## Things that render nothing (and fail the gate)

Meridian resets Tailwind's own scales, so only its names exist: `font-regular|medium|semibold`, `rounded-xs…xl|full`,
`shadow-card|raise|overlay|control|accent|halo`, `text-2xs…2xl|page|hero|display`, and colour roles such as `bg-surface`,
`text-ink-2`, `border-line`, `text-accent-ink`. `font-bold`, `rounded-2xl`, `shadow-lg`, `bg-white`, `text-gray-500` emit
no CSS. Spacing is the 4px multiplier (`p-6` is 24px).
