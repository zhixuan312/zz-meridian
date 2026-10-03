# Activity feed

The activity feed lists what happened, who did it and when, one line per event, newest first, and always says when an agent acted and for whom.

Status: beta

## Anatomy

1. **Actor**: a 24px Avatar for a person; a dot in a soft disc for the system (toned when the event is good or needs attention); an Agent mark for an agent.
2. **Sentence**: the actor (`ink` 500), the verb (`ink-2`) and the object (`ink`); for an agent, "· for Jonas Weber" in `ink-3`.
3. **Time**: relative (`text-xs`, `ink-3`, tabular), the exact time in its title.
4. **Thread**: a 1px `line` joining the actors down the list.

## Composition

Avatar, Agent mark, and the date formatters, inside a Card with a divided header.

## Data

`ActivityEvent { id, at, actor, via?, verb, object, tone? }`. `via` names the agent when an assistant acted for `actor`. `tone` (`positive`, `warning`, `critical`) colours the system's dot only.

## States

| State | What shows |
|---|---|
| Events | One line each, 16px apart |
| Empty | An Empty state: "No activity yet. Changes to keys, limits and deployments appear here." |
| Loading | Three Skeleton lines with discs |

## Surfaces

- **Console** and **Mobile**: the same; on phones the sentence wraps and the time stays top right.
- **Embed**: the five newest, with Expand for the rest.

## Agents

This is where provenance lives. An agent's change reads "Claude raised the rate limit for Parallax AI to 2,000 rpm · for Jonas Weber", with the square Agent mark, never a person's round avatar.

## Accessibility

- An ordered list; each time is a `time` element with its ISO value.
- Contrast (dark): verb `ink-2` 8.0:1 on surface, time `ink-3` 6.4:1.

## Content

- Past tense, plain verbs: "rotated the production signing key", "deployed gateway v4.18.2". The object is specific.

## Do and do not

- Do write the agent and the person on every agent event.
- Do not log reads; the feed is for changes.

## Implementation

```tsx
import { ActivityFeed } from '@/components/patterns/activity-feed';

<ActivityFeed events={events} now={updatedAt} />
```
