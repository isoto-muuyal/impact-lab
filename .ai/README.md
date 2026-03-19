# AI Workspace Guide

This folder is an example scaffold for AI-assisted development workflows in `Impact-Lab`.

It does not affect the running application by itself. It is for:

- reusable prompts
- preflight and review checklists
- example hook scripts for AI tools that support hooks
- templates you can adapt for your own team

## Relationship to `AGENTS.md`

Use both:

- `AGENTS.md` files define standing instructions by folder scope.
- `.ai/` files define reusable operational assets such as prompts, hook scripts, and checklists.

Practical split:

- put stable rules in `AGENTS.md`
- put repeatable workflows in `.ai/`

## Suggested Structure

- `.ai/README.md`
- `.ai/prompts/`
- `.ai/checks/`
- `.ai/hooks/`
- `.ai/templates/`

## Best Practices

1. Keep instructions short, concrete, and testable.
2. Prefer "always/never" rules over vague style advice.
3. Store prompts for recurring work only.
4. Put deploy and migration safety checks close to CI examples.
5. Treat hook scripts as guardrails, not magic.
6. Fail fast when schema and deployment are out of sync.
7. Update AI instructions when architecture changes, not months later.

## Important Note on Hooks

These example hook files are for AI tools that support lifecycle hooks.
They are not React hooks and are unrelated to `client/src/hooks`.

Examples of AI-tool hook timing:

- before-edit
- after-edit
- before-commit
- pre-deploy

Whether these run automatically depends on the AI tool you use.

## How to Use This Folder

1. Read the prompt/checklist that matches the task.
2. Copy or adapt the relevant template.
3. If your AI tool supports hooks, point it at the scripts in `.ai/hooks/`.
4. Keep the examples versioned so the whole team shares the same expectations.

