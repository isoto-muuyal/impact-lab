# AGENTS.md

This file applies to everything under `server/`.

## Backend Rules

- Keep business logic in storage/helpers where possible; keep route handlers thin.
- Every write path must validate input and enforce authorization.
- When a feature introduces membership or workflow states, model them explicitly in the database.

## Authorization

- Distinguish between:
  - discovery access
  - summary access
  - full-detail access
  - mutation access
- Do not assume list visibility implies detail visibility.

## Database Safety

- If a schema change is required, update deployment behavior in the same task.
- Prefer explicit cleanup of dependent rows before deleting parent rows.
- Add helper methods in `storage.ts` for repeated access checks or related fetches.

## Notifications

- For user-facing workflow decisions, prefer persistent notifications over one-time logs.
- Notification creation should happen in the same transactional flow as the decision whenever practical.

