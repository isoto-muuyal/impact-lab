# Claude-Style Hooks Example

This is an example of how people often use "hooks" in AI coding tools.

It is not tied to React hooks.

## Typical AI Hook Use Cases

- before edit: run a guard or load context
- after edit: run formatting or lightweight validation
- before commit: run build/test checks
- before deploy: ensure schema rollout is included

## Example Mapping for This Repo

- preflight build hook:
  `.ai/hooks/preflight-build.sh`

- schema drift warning hook:
  `.ai/hooks/schema-drift-guard.sh`

- frontend runtime-risk warning hook:
  `.ai/hooks/frontend-import-guard.sh`

## Best Practice

Start with non-destructive hooks that print warnings or run read-only checks.
Only automate write actions after the workflow is stable.

