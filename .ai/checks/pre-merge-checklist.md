# Pre-Merge Checklist

Use this before merging substantial work.

- Did I change `shared/schema.ts`?
- If yes, did I update deployment or migration rollout?
- Did I add or change authorization logic?
- If yes, did I update both the backend and the UI states?
- Did I add a new route?
- If yes, is validation explicit and failure behavior clear?
- Did I add a mutation?
- If yes, are relevant React Query caches invalidated?
- Did I add new user workflow states?
- If yes, are they visible in the UI with clear labels?
- Did I run `npm run build`?
- If not, why not?

