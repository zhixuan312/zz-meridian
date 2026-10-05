# Start a dashboard

A new dashboard starts from this repository running, not from a blank page. Six steps take it from ZZ Meridian's own dashboard to yours; each is one file or one folder.

The fastest way is to let your coding agent do all six: `npx zz-meridian@latest create my-dashboard --name "Acme Ops"` copies and brands the template and installs the `zz-meridian` skill into it; then describe the dashboard you need to Codex or Claude Code. The steps below are what they do, for doing it by hand.

## 1. Copy it

```sh
npx zz-meridian@latest create my-dashboard   # the template, branded, with the Atlas left out
cd my-dashboard
pnpm dev   # the template at http://localhost:3000
```

To keep the Atlas while you build, clone this repository instead (`git clone https://github.com/zhixuan312/zz-meridian.git my-dashboard`, then `pnpm install`): it serves the Atlas at `/system`.

Keep the Atlas while you build: it is the specification of every part you are about to use. To ship without it, delete `app/system/` and remove the two rail entries that point at `/system` (Design system and Docs) from `nav` in `src/app.config.ts`. Keep `src/system/`: every card's preview imports its specimen helpers, and the gate regenerates its registry.

## 2. Name it

`node scripts/brand.ts --name "Acme Ops" --workspace "Production" --timezone "Europe/London"` does this step (and step 3) in one command. By hand, `src/app.config.ts` holds everything that makes the product yours:

- `app.name`, `app.workspace`: the rail, the document title, the sign-in screen.
- `app.accent`: `indigo`, `cobalt`, `jade` or `graphite`. A person can still change it in Settings.
- `app.timezone`: every date and every daily bucket is cut on it.
- `nav`: the rail. Adding a page is a route file plus a line here.

Put your logo in `public/` as an SVG and set `logo: '/logo.svg'` in `app`: the mark shows it at 20, 24, 28 and 32 pixels, with an empty `alt` beside the product name. `theme: 'dark'` or `'light'` sets the default theme before anyone picks one.

## 3. Brand it, if you need more than an accent

An accent preset is two numbers. `node scripts/brand.ts --hex '#RRGGBB'` (or `--hue <0-360> --chroma <0.10-0.18>`) adds your brand's hue as a preset, makes it the default, holds contrast in every theme by itself, and warns when the hue sits within 20° of a status colour. By hand, copy `tokens/accent.indigo.tokens.json` to `tokens/accent.<name>.tokens.json`, set `accent-h` (OKLCH hue) and `accent-c` (chroma), add it to `tokens/zz-meridian.resolver.json` and set `accent` to its name in `src/app.config.ts` (the appearance menu lists it from there), then:

```sh
pnpm tokens          # regenerate the CSS
node scripts/contrast.ts   # every pair, every theme, your accent included
```

If a pair fails, lower the chroma, or give the preset a lightness override for that theme (see `accent.jade.tokens.json`).

## 4. Connect your data

Your pages, your server actions and the assistant read and change records through `src/data/collections.ts`, and read nothing else. Replace its collections with yours (rows from your API, or `arrayCollection` while you build), add `src/data/<product>.ts` for any other types and queries, and point your pages at them. The template's own sample, ZZ Meridian's own dashboard, lives in `src/system/fixtures/` because the Atlas and every card preview read it; leave it there. Shape your records to the types the patterns define (`ActivityEvent`, `Incident`, `Service`) and they render without adapters. Two rules carry over:

- Read freshness from when the data arrived (the newest ingest time), never from `now()`.
- Return `null` for "not measured"; the formatters render it as a dash, never as zero.

## 5. Arrange your pages

Every page is a `PageFrame` holding a `Stack` of `Row`s. Start from the closest preset and change what it shows, not how it is laid out:

| You need | Start from |
|---|---|
| A summary with one leading figure | Overview (`/`) |
| A list of records with filters | Requests (`/requests`) |
| One record | Request (`/requests/[id]`) |
| Two big charts and breakdowns | Analytics (`/analytics`) |
| Services and incidents | Health (`/health`) |
| Settings and forms | Settings (`/settings`) |

If a page seems to need a new style, it needs a pattern or a component instead: specify it in its layer (see `CONTRIBUTING.md`).

## 6. Put it in front of an agent

Each route under `app/embed/` is an MCP App view. Register each as a `ui://` resource and a tool on your MCP server (`docs/agents.md`), and the dashboard appears in any MCP Apps host, inline beside the answer, with Expand, Ask and Proposals working.

The console's assistant is off until you set the `ASSISTANT_*` variables (`.env.example`); it uses the same collections, so nothing more is wired. See `docs/assistant.md`, and put your sign-in check in the dashboard layout, in `app/api/assistant/route.ts` and in every server action (each `actions.ts`).

## Before you ship

```sh
pnpm verify    # the gate, a production build and its route policy, and the browser audit of every page against the built app
```
