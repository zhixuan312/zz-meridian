# 0012 · Roles and feature access

Date: 2026-10-10 · Status: accepted

## Context

Before this, the sample kept its roles in the member fixture, drew every destination in the rail for everyone, and let each page decide access on its own — `/keys` with a hand-written check, others with none. A dashboard needs one account of who may do what, asked the same way by the rail, a page, a control and an agent, or the answers drift: a destination the rail hides is still reachable by its address, and a change a page withholds may still be run through an agent.

- **The role list lived in the fixture.** The roles were part of the member fixture, so a role was sample data rather than a definition a product could replace, and nothing carried which grants a role had.
- **Every need was written where it was used.** A page checked one grant, an action checked another, the rail drew from a third place, and nothing tied them together, so a changed grant meant finding them all.
- **The template had no seam for a product's own roles.** A team that already has roles and a permission table had nowhere to put them without restating them in Meridian's shape, and had no single place to answer "who can open this page".

## Decision

Each choice below can be reversed on its own.

- **One grant vocabulary, one feature table.** A grant is `object:read|create|update|remove`. What each page and each control needs is declared once in `src/data/features.ts` (`FEATURES` and `ACTIONS`, keyed by `FeatureId` and `ActionId`), and every surface references it by identity. *Why:* a need written in two places drifts; written once, the rail, the page, a view tool and an agent cannot disagree, and a test holds them all to the same table.
- **Main roles and add-ons, unioned with no deny.** A member has one main role and any number of add-ons, and `effective(role, addOns)` is the union of their grants. There is no wildcard and no deny, so a grant is never taken away by another role. *Why:* a union is the one rule a reader can hold in their head, and a deny would make "who can do X" depend on every role a person holds at once.
- **Definitions in code, assignments in data.** The roles and their grants are code (`src/data/roles.ts`); which member holds which role, and which add-ons, is data on the member record. *Why:* a grant changes with a deployment and is reviewed as code; who is an Admin changes with a person's job and is changed by an Owner, not a commit.
- **Owner and Admin both kept, separated by the ownership-level actions.** An Admin carries every dashboard and every member and key grant an Owner does; the two differ only in the workspace-level grants (`workspace:update`, `workspace:remove`) — changing the workspace, and giving or changing an Owner. *Why:* an Owner is the person the workspace answers to and an Admin runs it day to day, and separating them by the actions that dispose of the workspace keeps ownership from spreading to everyone who administers members.
- **Meridian's own NoAccess view, not `forbidden()`.** A page a person may not open returns `src/views/no-access.tsx` as a normal 200 that holds none of the records; the framework's `forbidden()` is experimental and the template does not depend on it. *Why:* the template ships a stable view whose copy is generated from the role table, and an adopter should not carry an API that may change under them for the one screen every denied request sees.
- **Hide what is known to be unusable; refuse what arrived anyway.** The rail, the command palette and a page withhold a destination or a control the person may not use, and the page still refuses at the gate, a view tool at `requireNeed`, and the assistant at execution. *Why:* hiding is a courtesy that stops a person reaching a wall; it is not enforcement, and a request that arrives by its address, a stale tab or a listed tool must be refused by the check that runs when it is served.
- **An agent never changes a role assignment.** The members' `role` and `addOns` are `pageOnlyFields`: absent from every agent's write schema and refused at execution if sent, and an agent's member create always gets role `Member` and no add-ons. *Why:* a role assignment is what grants access, so an agent that could set one could hand itself anything, and the person's own action is the right place for it.
- **Grants and member rules are two questions.** What a person may do is the role table's (`effective`); what may be done to a particular member — the self, Owner and last-active-Owner rules — is the boundary's (`src/data/member-mutations.ts`), asked on top. *Why:* "may this person change members at all" is a grant, while "may they change *this* member" is a rule about the caller and the target; keeping the roster out of the role table is what lets a product replace either without the other.
- **An invalid identity is no identity.** A session the policy cannot resolve — an unknown person, a suspended one, a cookie naming nobody — gives no session and never falls back to the Owner or to anyone else. *Why:* a fallback turns a defect in the session into full access, and the failure is silent because the request still succeeds.
- **A revocation is checked at execution.** A query re-resolves the caller and the read grant when it runs (`scopedQuery`), an approved change re-checks the same person and operation before it applies, and the member boundary re-reads the caller on every step. *Why:* listing a tool or drawing a control is not enforcement; a person may be suspended or demoted between the moment a tool was offered and the moment it runs.
- **The safety a template needs is light-weight.** The demo runs one member write at a time per workspace in a promise queue and says so; an adopter's guarantee has to come from the transaction their own database provides. *Why:* a template cannot know whether there is a database, and a queue is enough to keep the demo's own writes from racing on a stale count without pretending to be the durable guarantee a product needs.

## Consequences

- A member record carries `role` (a main role, default `Member`) and `addOns` (default `[]`), and the members collection refuses an unknown role or add-on; anything that imported the roles from the member fixture takes `MAIN_ROLES` from `src/data/roles.ts` instead. This is a breaking change.
- A nav item requires `needs`, and it points at its feature's need by reference; a view tool requires `needs` too. Both are breaking for an adopter's own nav and view tools.
- A person may no longer suspend or remove themselves, and a change that would leave the workspace with no active Owner is refused.
- A page that awaits its gate is an async page, so the pages that open with it stream their masthead with the gate rather than in the static shell.
- The demo signs in as whoever the View as cookie names, and an adopter replaces `current()` with their own session and deletes the View as action and its cookie.
- The Members page draws a Roles & access matrix generated from `roles.ts` and `features.ts`, so editing either table edits the section.
