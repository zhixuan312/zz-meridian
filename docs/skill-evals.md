# Evaluating the skill

A person gives their agent one sentence (`docs/distribution.md`), and the skill carries everything the sentence leaves
out: the standard, the definition of done, and how the agent evaluates its own work
(`skills/zz-meridian/references/standard.md`). When those three are right, an agent that follows the skill reaches the
standard on the person's project. So a change to the skill is judged by whether an agent reading it chooses the right
route, decides instead of asking, knows what done means and how it will know, and finds the defects that keep a product
from it. Rebuilding a whole dashboard to judge a change in wording is not needed.

## Four levels

| Level | What it shows | Cost | When |
|---|---|---|---|
| L0 static | Every path, command and flag the skill names exists (`node scripts/check.ts`); the text has no dated or contradictory instruction (a prompt audit, `/claude-api prompt-audit`) | seconds | every change to the skill |
| L1 decisions | An agent reads the skill in a scenario's folder and stops before the first command that writes: its route, its announcement, its decisions, its brief, the views it will score, its definition of done and how it will evaluate | 2 to 5 minutes each, run side by side | a change to the route, the decisions, the brief or the standard |
| L2 planted defects | An agent runs the loop on a built Meridian project with known defects planted (a clipped name, a missing empty state, a literal colour, a wrong total, a page with no protagonist, a stale `verify.config.ts` route): which it finds, which it fixes, and whether it stops only when `--full` prints the outcome | about 15 minutes | a change to the standard or the loop |
| L3 end to end | The sentence, a fresh agent and a real request, from nothing (greenfield) or an existing app (brownfield) to the hand-over | 1 to 2 hours each | weekly, never per change |

## L1 scenarios

Each runs in a scratch folder. A scenario that starts from an existing app copies its fixture there, renames
`fixture.env` to `.env` (an address on a reserved domain that stands for production), and commits it, so the folder is
the clean repository a team would have.

| Scenario | Folder | The request after "to:" | What a right answer does |
|---|---|---|---|
| Greenfield | empty | build an orders console for our bakery chain, three shops; today's orders, late pickups, which cakes sell best | `create .`; pages that answer the three questions; timezone, currency and "late" recorded as decisions; deletes the sample pages it does not need |
| Next.js brownfield | `cli/test/fixture-crumb-ops` | make our ops console look and work like a professional product, and let the shop leads see late pickups at a glance | `adopt` in place; finds `API_URL` is production before running anything; fake API first, committed, with a request log; "before" renders; lists every route and action that must survive; keeps `lib/api.ts` |
| Vite brownfield | `cli/test/fixture-vite-rota` | turn our rota app into a proper dashboard for the ward managers | `create` beside it, never in it; ports both routes and the one request; "before" from a copy; names the cookie and CORS change of a read moved to the server; switching over is the person's |
| Update | a project made with `create --no-install`, committed | update Meridian to the latest | `update --dry-run` first; already current means it says so and stops |
| Rebrand | the same | change our brand colour to #D97706 | `brand` with the manifest's version; sees the amber is 10° from the warning hue; nearest safe hue as the accent, the exact colour in the logo, recorded, no question |
| Ambiguous | `cli/test/fixture-crumb-ops` | build me a dashboard for this | one question at most, the route, with the recommendation first; without an answer it takes the recommendation and says so |
| Based on | `cli/test/fixture-crumb-ops` | based on this folder, make a new dashboard in ../crumb-v2 | `create ../crumb-v2`; reads the source and never writes it; ports its data layer and its contract |
| A project with its own register | a Meridian project with a `docs/register.md` for a fictional company with a light-first design language of its own (its theme default, signature elements, anti-defaults and a brand route), committed | restyle the settings page and add a billing page | reads `docs/register.md` before building; scores Colour, Typography, Hierarchy and Originality against it, and names it on the scoreboard's "Register:" line; keeps every floor, required state and accessibility check unchanged; follows its brand route instead of `brand`'s accent rules; refuses a register line that lowers a floor (a looser contrast, a skipped state) and records the refusal as a decision |

Every scenario is also held to what is true of all of them: the agent reads `standard.md` before building, asks nothing
but the route, says the route before the first command, records decisions with their reasons, lists every view it will
score, and states the definition of done as the commands and lines that will prove it.

The probe is given the sentence, told where the skill and the local CLI are, told to write nothing, and asked for, in
order: its announcement, the route and first commands, its decisions, the brief, the views, the definition of done and
how it will know, how it will evaluate each view, its questions, and what in the skill was unclear, contradictory or
missing, with `file:line`. Run at least one scenario on a smaller model than the one the skill is written with: the
skill is for anyone's agent.

## Reading the results

Write what a right answer does before the probes run, and grade against it. A finding counts when the skill caused it:
a contradiction, a path that does not resolve, a case it does not cover, a step that would stop an unattended run, a
definition of done that cannot be reached. A finding that comes from the probe's own context (a memory or rule of the
machine it ran on) is not the skill's. Fix each counted finding in the skill or in Meridian's code, and run the
scenarios it touched again.

## What each level finds

Each level finds what the ones below it cannot, which is why none replaces another:

- **L1** finds what reading the skill against the code shows: a definition of done the scripts make unreachable (the
  first round found that the walk-throughs drove the template's own sample pages, so no product could pass), a step
  that would stop an unattended run, a contradiction between two files, a case no route covers.
- **L2** finds where judging by eye is not enough. Of six planted defects an agent found five; the one it missed, a
  second featured metric, became a rule in `scripts/check.ts`. A rule the code can check is checked there, not left to
  the scoreboard.
- **L3** finds what only building shows: the gate misreading an adopted project's imports, a phone card's badge over
  a long name, a verify that crashed on its own early exit. Each became a fix with a test, so the weekly run that
  found it does not have to find it again.
