# Schema Change Checklist

Use this for any database-affecting change.

- Update `shared/schema.ts`
- Review all affected types in client and server code
- Add storage methods for new entities or relations
- Add or update API validation
- Add authorization checks for new read/write paths
- Ensure deletes clean up dependent rows where needed
- Update deployment workflow so production applies the schema change
- Verify local build passes
- Call out if production still needs `db push` or migration execution

Project-specific reminder:

This repository previously broke in production because code was deployed before the new tables were applied. Treat schema rollout as part of the feature, not as a follow-up.

