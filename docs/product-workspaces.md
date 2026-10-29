# Product workspaces

ZZ Meridian's own dashboard is one product with fifteen destinations, grouped into three workspaces: Main, Business and Engineering. This guide says what each workspace is for, where each destination lives, who can do what in it and what to try first, and it shows how to give a product of your own workspaces, or none.

## The three workspaces

A workspace is where a person looks. It decides which destinations the rail and the command palette (⌘K) list, and nothing else: what a person may open and change is decided by their role, page by page. Choose a workspace in the menu at the top of the rail, under Show. That menu is the one place a workspace and a grant meet, and only in which rows it offers: a workspace is listed when the person may open at least one of its destinations, and a row opens the workspace's home, or the first destination of it the person may open when the home is not one of them. Neither changes what any page allows.

- **[Main](/)**: For everyone who needs the whole product at a glance: how it is doing, who is in it and how it is set up. Its home is Home, the company's page for the period you choose: revenue and its record, customers, tokens served and requests, the days inside the band and compute in use (with compute cost and gross margin for an Owner and an Admin), then the year counted a period at a time, what is sold, Business and Engineering at a glance with a way into each, and what is worth knowing across the company, each line opening the page where it is handled. Main also holds Members, Settings, and the Atlas (Design system and Docs).
- **[Business](/business)**: For the people who answer for customers and usage: traffic, who relies on the product and what they ask of it. Its home is Revenue, which leads with what customers paid in the period you choose, in its Featured metric with its record and revenue a day, then shows it against a year ago, the best day yet, who is past due, who pays by plan, every customer's week, the customers from a trial up to Enterprise, what is worth a look, what they buy and where they are, each customer it names opening its page. It holds Customers, where a row opens that customer's own page; Usage, which leads with the requests of the period you choose in its Featured metric, against the period before with requests a day, then a year of requests a day a cell, the facts of the period, and over the last 30 days when requests come, where from, what is asked for and how it was answered; and Requests, a page under Usage, where a single request opens inside it.
- **[Engineering](/engineering)**: For the people who run the product: whether it is up, who holds its keys, what is being fixed, tested and released. Its home is Now, which leads with how many days were inside the band in its Featured metric, then shows which services are up this moment and the incident nobody has resolved, the days inside the band day by day, what each model and region carries, what ships, the work with the reader's own marked, the slowest endpoints, the month's releases, tickets, runs and incidents, and what changed. It holds Services, which leads with the uptime of every service over 90 days in its Featured metric, then each service and its incidents; Tickets, Tests, Releases and API keys.

The bell in the top bar is the same in every workspace. It lists what needs a person across the product: incidents nobody has resolved, the customers past due in one alert, failing verifications, and high-priority tickets nobody owns. Each alert opens the page where it is handled: a customer past due, the failing verifications and an unowned ticket open their list filtered to those records (the latest run of each verification that failed; the one ticket by its title; a lone customer past due opens its own page), and an incident opens Services.

## Where each destination lives

The rows follow the navigation's order. The last column names who the rail leaves the destination out for; the page itself refuses them as well.

| Workspace | Destination | Address | What it is | Who may not open it |
|---|---|---|---|---|
| Main | Home | `/` | The company at a glance: revenue, customers, use, the year, the two teams and what is worth knowing | Nobody |
| Main | Members | `/members` | Who is in the workspace, their roles and add-ons, and when they last used it | A Viewer |
| Main | Settings | `/settings` | The workspace's name, and how the console looks and behaves on your device | Nobody |
| Main | Design system | `/system` | The Atlas: the specification of every part the product is built from | Nobody |
| Main | Docs | `/system/start/start-a-dashboard` | The guides, opening at Start a dashboard | Nobody |
| Business | Revenue | `/business` | What customers paid over a period, first, then who pays it, every customer's week and what is worth a look | Nobody |
| Business | Customers | `/customers` | Who uses the product, by plan and status, with usage and revenue | Nobody |
| Business | Usage | `/usage` | How many requests a period had, first, and what is true of it, a year of days, when requests come, where from, what is asked for and how it was answered | Nobody |
| Business | Requests | `/requests` | A sample of the API requests the product received, with status, latency and customer | Nobody |
| Engineering | Now | `/engineering` | How many days were inside the band, first, then which services are up this moment and what is open, the models, compute in use, what ships, the work, the slowest endpoints, the last 30 days and what changed | Nobody |
| Engineering | Services | `/services` | The uptime of every service over 90 days, first, then each service's state now and over 90 days, and its incidents | Nobody |
| Engineering | Tickets | `/operations-tickets` | The work tracked against a service: what is open, what is waiting and who has it | Nobody |
| Engineering | Tests | `/tests` | The verification runs, newest first, and which are failing now | Nobody |
| Engineering | Releases | `/releases` | Each release, which required verifications it has not passed, and which version is live | Nobody |
| Engineering | API keys | `/keys` | The keys that let services call the product, with owner and scopes | A Viewer, unless it also holds the Key manager add-on |

Seven of these pages are lists of records, and share one arrangement, an optional row of summary tiles over a table (Members and API keys have no tiles), which is the [Records template](/system/pages/template-records): Members, Customers, Requests, API keys, Tickets, Tests and Releases.

## How a page finds its workspace

The address alone decides. For an address, the product finds the navigation entry it falls under and takes that entry's workspace.

- An entry owns every address beneath it, on whole path segments. `/requests` owns `/requests/<id>`, so a request's own page is in Business and inherits its parent's navigation; `/customers` owns `/customers/<id>` in the same way. It does not own `/requests-archive`.
- When two entries could own an address, the longer one wins. `/system/start/start-a-dashboard` belongs to Docs, not to Design system.
- The home, `/`, owns only itself.
- An address no entry owns, such as the page shown for an address that does not exist, shows Main's navigation.

Nothing is kept between visits: no cookie, no stored choice, no query parameter. So a pasted link, a refresh, Back and Forward all land in the workspace that owns the page. Two browsers can sit in two workspaces at once. Choosing the workspace already in view does nothing, and a navigation that has not arrived leaves the rail on the workspace of the address the browser is still at.

## Who can do what

A person has one main role (Owner, Admin, Member or Viewer) and any number of add-ons; the only add-on is Key manager. What they may do is the union of the two, and nothing takes a right away.

| Role | Reads | Writes |
|---|---|---|
| Owner | All fifteen destinations | Everything an Admin does, and the workspace's name in Settings |
| Admin | All fifteen destinations | Creates and revokes API keys; invites members, changes their roles, suspends, reactivates and removes them; replays requests; creates tickets and moves them along. Sees the workspace's settings but cannot change them |
| Member | All fifteen destinations | Replays requests; creates tickets and moves them along. Sees Members and API keys but changes neither. Has no Workspace section in Settings |
| Viewer | Thirteen of the fifteen | Nothing in the product's records |
| Key manager (add-on) | Adds API keys to whoever holds it | Creates and revokes API keys |

A Viewer reaches thirteen of the fifteen destinations; the two it cannot open are Members and API keys. A Viewer who also holds Key manager opens API keys and manages them, and still cannot open Members.

One set of records is not every role's to read. What compute cost each day (the `costs` collection, the grant `costs:read`) is read by an Owner and an Admin only, whether a page, a view tool or the assistant asks; a Member, a Viewer and an add-on alone are refused it before anything is read. The GPUs provisioned and used (`compute`), what each model answered (`usage`) and the prices (`models`) are read by every role.

When a person may not open a page, what they get is the product's choice, declared once as `refusal` in `src/app.config.ts` and read by `gate` on every page; nothing else in the product decides it. Under either choice the answer is a normal 200 inside the console, not an error, and it holds none of the page's records.

- `explain`, the sample's choice: the page names itself, says who can open it and who to ask, for example "Owners, Admins and Members can open it. Ask an Owner or Admin for access.", and offers one way out: the first destination of the same workspace they may open, or Main's home when there is none. A page with no navigation entry of its own, such as a request's page, offers Main's; a customer's page asks what Customers asks, so it offers Business's. The tab carries the page's own title.
- `absent`: the address answers exactly as one that names nothing. The console's missing page is drawn in the shell, the tab reads "Not found", and the address is walked back past every page the person may not open, so a Viewer's `/keys` reads "No page in ZZ Meridian lives at this address." as `/nothing-lives-here` does. Nothing on it names the page, a role or who to ask, and neither does the loading state drawn before it, for anyone. An address below such a page, a Viewer's `/keys/anything`, walks back past it as well. When a person may open a page but not use a control on it, the control is not drawn, and nothing on the page says why or who holds it: a Viewer's Tickets has no New ticket and no row menu, an Admin's Settings shows the workspace read-only, and an Admin's Members draws nothing on an Owner's row. A change forced past the page is still refused, with the boundary's own sentence.

The sample signs in as Maya Chen, an Owner. At the foot of the rail's menu, View as lists five sample people: Maya Chen (Owner), Jonas Weber (Admin), Priya Nair (Member), Lucas Meyer (Member with Key manager) and Grace Liu (Viewer).

## Tasks to try

Each task runs in the sample, signed in as Maya Chen unless it says otherwise. The product's own browser journeys walk tasks 1, 2, 3, 5, 6, 9 and 10.

1. **Follow a request from Main into Business.** Start at Home and press Open Business on the Business card. The address is `/business` and the rail names Business, listing Revenue, Customers and Usage; Requests is a page under Usage, drawn once its branch is open. Press Usage pages, then Requests, then a row of the table. The request's own page opens and the rail still names Business with Requests marked as current. Refresh, then press Back: the rail stays on the workspace of the address each time.
2. **Switch workspace from the rail.** Start at Home. Open the menu at the top of the rail, named for the product and the workspace in view, and press Engineering under Show. The address becomes `/engineering` and the rail lists Now, Services, Tickets, Tests, Releases and API keys. Open ⌘K: the destinations it lists are Engineering's.
3. **Create a ticket and see Main count it.** Start at Home and note Tickets open on the Engineering card. Switch to Engineering, open Tickets and press New ticket. Type a title, press Create ticket. The form closes, a toast says "Ticket created", and the ticket is in the table with the state Open. Switch back to Main: Tickets open is at least one higher.
4. **Move a ticket along.** In Tickets, open the menu "Change state of" on the ticket you made and press "Move to waiting". A toast says "Moved to waiting", and the Open tickets and Waiting tickets tiles above the table each change by one. A waiting ticket can go back to open or be closed; a closed ticket can only be reopened.
5. **Leave Settings with an unsaved change.** Start at Settings, type in the Name field of the Workspace section, then choose Business in the rail's menu. The page asks "Leave without saving?". Press Stay and the page, the typed text and the rail are as they were. Choose Business again and press Leave: you arrive at Revenue. Pressing Back is not asked; see the limits below.
6. **See the product as a Viewer.** Open the rail's menu and, under View as, choose Grace Liu. Members and API keys leave the rail. Open Tickets: there is no New ticket button and no menu on a row, and nothing says who can create or change a ticket. Type `/members` into the address bar: the page says "You don't have access to Members", says who can open it, and offers "Go to Home".
7. **Read the bell.** Press the bell, Alerts, in the top bar. Press the alert that says how many customers are past due: Customers opens filtered to past due. Press one about failing verifications: Tests opens on the latest run of each verification, filtered to the ones that failed, which is what the alert counts, and the rail moves to Engineering.
8. **Find out why a release is not ready.** In Engineering, open Releases and pick a row whose state is In testing; Home's Engineering card counts them as Releases in testing. Its Verification cell names each required verification that has not passed and why: it failed, it was skipped, or it has no run yet (a phone counts them: "1 failed, 2 not run"). Press the "of" count, for example "2 of 3 passed", and Tests opens with only that release's runs, under a line that names the release. The count is a link in the table a wide screen draws; on a phone the row is a card and the count is text.
9. **Open every destination, as an Owner and as a Viewer.** Open each of the fifteen destinations by its address, in the order of the rail. Each opens at its address, its page is headed with the entry's name, the rail names the entry's workspace and marks the entry as the current page; Design system and Docs open the Atlas, headed by its own titles, whose shelf leads back to Main. Signed in as Grace Liu, the Viewer, every entry opens except Members and API keys; typing the address of either draws "You don't have access to" followed by its name.
10. **Open a customer from the list.** In Business, open Customers and press a row. The customer's page opens, headed with its name, and the rail still names Business. Open a past-due customer, Lumen Studio, at `/customers/lumen-studio`. A customer that has left is listed under the status Left and still has its page. An address under `/customers/` that names nobody draws the missing-record page inside the shell, with the rail still on Business.

## Three meanings of "workspace"

The word means three different things in this product. They share a name and nothing else.

1. **The navigation context**: `workspaces` in `src/app.config.ts`, the subject of this guide. Main, Business and Engineering, each with a label, an audience sentence and a home. It decides which destinations the rail lists.
2. **The environment line**: `app.workspace` in the same file, "Production" in the sample. It is the name of the environment the product runs as, and it appears beside the product's name, for example in a page's kicker ("ZZ Meridian · Production") and in the default name of the settings record. It does not choose navigation.
3. **The settings record**: the `workspace` collection, one row holding the workspace's name and its address. An Owner edits the name in the Workspace section of Settings, and an invitation to join names the workspace by it. It is data, not configuration. The rail shows the product's name, `app.name`, from the configuration and not this record, and every date is cut on the configuration's `app.timezone`.

## Making your own

A product declares its workspaces once, in `src/app.config.ts`:

1. Export `workspaces`: an object with one key for each workspace, holding `label` (its name), `audience` (one sentence saying who it is for, in the voice of the rest of the product) and `homeHref` (the entry its menu row opens; the first destination of the workspace the person may open is what the row opens instead, when the home is not one of them).
2. Give every entry of `nav` a `workspace` naming one of those keys, and a `needs` that names a feature's need in `src/data/features.ts`. An entry with `under` naming another entry's `href` is that page's sub page: the rail draws it inside the parent's branch, closed until the person opens it or is on one of its pages (the Rail card's README).
3. Keep `src/views/workspaces.ts`, which derives each workspace's navigation (`navOf`) and answers which workspace an address belongs to (`workspaceOf`), and `src/views/workspace-chrome.tsx`, the product's adapter over the console chrome. The layout uses `WorkspaceRail` and `WorkspacePalette` in place of the plain rail and palette.

The sample's adapter, its refusal page and its browser journeys name the key `main`, and the journeys also name `business` and `engineering`. Keep a workspace with the key `main` for an address no entry owns, or change those places together.

A product with one navigation uses the console chrome without any workspaces. Its layout draws `ConsoleRail` and `ConsolePalette` from `src/views/console-chrome.tsx` with the `nav` from the configuration; with no scopes given, the top of the rail is an account menu and has no workspace switcher. `zz-meridian adopt` writes a configuration this way: the project's own pages as `nav` entries, with no `workspaces` declaration and no `workspace` field on any entry.

## What it does not do

- It holds writes in memory. A ticket, a member, a key or the workspace's name, once saved, lives in the running server's memory: it is lost when the server restarts and is not shared between servers.
- Its figures are the sample's own fixed data: one company's records, made by a seeded generator at a fixed clock. The weekday-and-hour grid, the hours of the day and the regions on Usage, the endpoints and the responses by status class are fixed figures of the last 30 complete days: they add up to the daily totals of those days, they are not worked out from the request log, and they do not follow the period chosen. The Featured metric's requests and requests a day, the title and the facts of the period do: a period is complete days counted back from yesterday, All is every complete day kept and has no period before it to compare with, and the day in progress is counted in no figure. A customer's requests, tokens and revenue cover the same 30 days, and its trend the last 14.
- No integration stands behind its verification runs and releases. They are the sample's own records: nothing runs a suite or ships a version, and the two pages only read and link.
- It sends no notification. The bell lists what needs a person when the page is read; no email, digest or message leaves the product. Inviting a member writes a member record with the status Invited, and the sample has no mail sender, so no message is delivered. Nobody subscribes to incident updates, and no customer is invited from the console.
- It does not delete its workspace. No control does, so there is nothing to confirm or to undo.
- The leave guard does not hold Back and Forward. A click on a link, a choice in the rail's menu or the palette, and a row that opens an address all ask "Leave without saving?" while something is unsaved. Back and Forward belong to the browser: they leave the page without asking. Closing or reloading the tab gets the browser's own warning.
- A workspace is not a permission boundary. It chooses what the rail and the palette list. A person's access is their role, decided page by page: someone who types an address from another workspace opens it if their role allows it, and a page they may not open refuses them wherever it sits.
