---
name: convex
description: Use when editing Convex schema, queries, mutations, actions, HTTP actions, auth, or indexes in taskman. Adapted from the public Convex docs.
---

# Convex

Adapted from the public Convex docs: <https://docs.convex.dev/understanding/best-practices> and <https://docs.convex.dev/ai>. This file is not the official `convex_rules.mdc`. Prefer those docs when they disagree with a guess.

## Functions

- Queries read. Mutations write. Actions call external networks. HTTP actions terminate HTTP routes in `convex/http.ts`.
- New public functions use `args` and `returns` validators.
- Private helpers used only by other Convex functions are `internalQuery`, `internalMutation`, or `internalAction`.
- Queries stay deterministic. Pass `now` in from the client, as `fleet.overview` does. Do not call `Date.now()` inside a query.
- Await every Convex promise. Do not leave a `ctx.db` write floating.

## Schema and indexes

- Tables and indexes live in `convex/schema.ts`.
- Query with an index (`withIndex`) for equality filters. Avoid `.filter` on a full table scan when an index can express the predicate.
- Upserts key off the stable string `key` fields already on the tables.
- List reads use the caps in `convex/persist.ts`. Crossing a cap on ingest fails the write. Do not silently truncate a push.

## Auth and HTTP

- Ingest compares the presented secret with `tokensMatch`. Do not log the secret or the raw token.
- A connection token is stored as a hash. The raw value is returned once at creation.
- HTTP routes stay thin and call internal mutations for writes.

## Local only

- Use `npx convex dev` or `npx convex dev --once` against a dev deployment.
- Do not run `npx convex deploy` against production, and do not change Convex or Railway settings from this repo's work.
