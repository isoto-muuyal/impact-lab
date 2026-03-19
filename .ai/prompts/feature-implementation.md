# Feature Implementation Prompt

Use this as a starting prompt when asking an AI tool to implement a feature in this repository.

## Prompt

Implement the feature with the existing patterns in this repo.

Constraints:

- preserve the current stack and architecture
- prefer extending existing components and storage methods over creating parallel systems
- if the feature changes data shape in `shared/schema.ts`, also update deployment/database rollout logic
- if the feature changes access rules, update both API authorization and the UI states
- reuse existing shadcn UI components from `client/src/components/ui`
- keep user-facing copy in Spanish unless the file already uses translation keys
- run `npm run build` at the end and report any unrelated repo issues separately

Deliverables:

- code changes
- short summary of what changed
- risks or follow-up work

Repository reminders:

- root `AGENTS.md` applies globally
- `client/AGENTS.md` applies to frontend work
- `server/AGENTS.md` applies to backend work
- `.github/AGENTS.md` applies to workflow/deploy changes

