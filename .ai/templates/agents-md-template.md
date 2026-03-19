# AGENTS.md Template

Use this as a starting point for any new scoped `AGENTS.md`.

## Scope

This file applies to everything under `[PATH]`.

## Goals

- preserve `[TEAM OR ARCHITECTURE GOAL]`
- keep changes small, explicit, and verifiable

## Do

- reuse existing patterns in `[PATH]`
- validate new inputs
- document assumptions when behavior is unclear

## Don't

- introduce parallel abstractions without a clear reason
- bypass authorization or deployment safety checks
- ship schema-dependent code without rollout support

## Verification

- run `[COMMAND]`
- inspect `[FILE OR AREA]`

