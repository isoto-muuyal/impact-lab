# AGENTS.md

This file defines repository-wide instructions for coding agents working in `Impact-Lab`.

## Scope

These instructions apply to the whole repository unless a deeper `AGENTS.md` overrides part of the behavior for a subdirectory.

Recommended structure:

- `/AGENTS.md`
- `/client/AGENTS.md`
- `/server/AGENTS.md`
- `/.github/AGENTS.md`

## Project Defaults

- Preserve the existing stack: React + Vite on the client, Express + Drizzle on the server.
- Prefer extending current patterns over introducing parallel abstractions.
- For searches, use `rg`.
- For manual edits, prefer focused patches over broad rewrites.
- Project already uses i18n keys, update it accordingly in every language.

## Database Changes

- Any schema change in `shared/schema.ts` must be matched by deployment-safe database rollout changes.
- Do not ship code that depends on a new table or column without updating deployment to apply schema changes.
- When adding new tables, also review authorization on all related routes.

## API Changes

- Keep list endpoints safe for broad access and restrict full-detail endpoints explicitly.
- Prefer additive API changes over breaking existing clients.
- Validate request bodies before writing to the database.

## Frontend Changes

- Reuse existing UI primitives from `client/src/components/ui`.
- If a feature changes permissions, reflect that in the UI before the user hits a server error.
- For workflow features, prefer visible status badges over silent failures.

## Verification

- Run `npm run build` after meaningful app changes.
- If `npm run check` fails because of known unrelated issues, call that out explicitly instead of hiding it.

