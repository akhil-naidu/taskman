---
name: typescript
description: Use when writing TypeScript in taskman. Adapted from the TypeScript handbook. Match the existing strict style.
---

# TypeScript

Adapted from the TypeScript handbook at <https://www.typescriptlang.org/docs/handbook/intro.html>.

## In this repo

- `strict` stays on. Do not loosen `tsconfig.json` to make a change compile.
- Model unions with the string unions in `convex/model/types.ts` (`TaskStatus`, `SyncProvider`, and the rest). Do not add a parallel enum for the same concept.
- Parse external JSON as `unknown`, then narrow. The ClickUp pull is the pattern.
- Do not use `any`. A boundary that is not yet typed uses `unknown` and a type guard.
- Exported functions that cross the Convex boundary take and return validator-backed types.
- Keep fixture and test data on `bot-a` and `bot-b`. Do not add real names as sample strings.
