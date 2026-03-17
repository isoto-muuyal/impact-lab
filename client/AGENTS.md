# AGENTS.md

This file applies to everything under `client/`.

## Frontend Rules

- Follow existing page structure and component composition before creating new shared abstractions.
- Use `@tanstack/react-query` for server state.
- Use existing shadcn UI primitives from `client/src/components/ui`.
- Keep interactions optimistic only when failure recovery is clear.

## UX Rules

- Permission-sensitive actions must show clear states:
  - disabled
  - hidden
  - pending
  - accepted/rejected
- For role-gated flows, guard both the button and the request submission path.
- Prefer compact cards and dialogs over navigation to half-finished pages.

## Styling Rules

- Preserve the app's light, neutral visual language.
- Avoid introducing new color systems when a small variant or utility class is enough.
- Use color to encode state consistently:
  - neutral for discoverable/inactive
  - blue for “already part of this”
  - destructive only for errors or irreversible actions

## Data Loading

- Default to query invalidation after mutations instead of hand-maintaining duplicated local state.
- If a detail route becomes access-restricted, keep summary data available through a list endpoint when discovery still matters.

