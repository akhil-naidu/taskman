<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## OpenSpec

This repo uses Fission-AI OpenSpec (schema `spec-driven`). The CLI is `@fission-ai/openspec`.

Before changing behavior:

1. Read `openspec/project.md` and `openspec/config.yaml`.
2. Read the baseline specs under `openspec/specs/`.
3. Propose a change before feature code. Create `openspec/changes/<name>/` with `proposal.md`, `tasks.md`, and spec deltas under `specs/`. Design notes go in `design.md` when the schema asks for it.
4. Implement from that change's `tasks.md`.
5. Keep specs in sync with the code. Archive a finished change so the baseline specs absorb the deltas.

Check the specs with `npx @fission-ai/openspec validate --all --strict`.

Do not merge, mark a pull request ready for review, push to `master`, or deploy. Do not put real bot names, fleet data, or secrets in the repo, fixtures, commits, or pull request text.
