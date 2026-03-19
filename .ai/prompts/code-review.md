# Code Review Prompt

Use this when asking an AI tool to review a change or pull request.

## Prompt

Review this repository change with a bug-risk mindset.

Focus on:

- behavior regressions
- authorization mistakes
- schema/deploy drift
- missing validation
- stale frontend states after mutation
- hidden runtime errors in production builds

Output format:

1. findings ordered by severity
2. open questions or assumptions
3. short summary

Specific repo concerns:

- any schema change must be deployment-safe
- list access and detail access must be checked separately
- route handlers should stay thin; repeated logic belongs in storage/helpers
- role-gated UI must still be enforced by the backend

