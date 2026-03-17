# AGENTS.md

This file applies to everything under `.github/`.

## Workflow Rules

- Deployment workflows must apply schema changes on every deploy, not only on first bootstrap.
- Prefer failing the deploy over serving code against an incompatible schema.
- If the app image does not contain migration tooling, run migrations in a dedicated ephemeral container.

## CI Expectations

- Keep workflow steps explicit and readable.
- Any step that mutates production infrastructure should run with `set -e`.
- When database credentials are assembled into a connection string, encode user, password, and database name safely.

