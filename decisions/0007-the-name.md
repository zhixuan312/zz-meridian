# 0007 · The name: ZZ Meridian

Date: 2026-10-03 · Status: accepted

## Context

The system was first named Meridian on its own, after its signature: one time cursor, a meridian line, shared by every chart and tile on a page. The owner's products form one family, and a standalone brand made the system read as someone else's.

## Decision

- The system is **ZZ Meridian**: "ZZ" for the family, "Meridian" for what makes it itself. In running prose "Meridian" is the short form.
- Machine names use `zz-meridian`: the package, the resolver (`tokens/zz-meridian.resolver.json`), the stored preferences key, and the skill. The DTCG extension namespace is `dev.zz.meridian`.
- The signature keeps its name: the cursor is "the Meridian".

## Consequences

- Titles, the Atlas and the front door say ZZ Meridian; specifications and guides may say Meridian.
- Breaking: a stored appearance choice under the old key `meridian.preferences` is not read; people pick their theme again once.
