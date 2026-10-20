# Tasks

## 1. Shell and connections

- [ ] 1.1 Add the shadcn shell, sidebar, and command palette — verify: Cmd-K or Ctrl-K highlights a command and Enter navigates without a pointer
- [ ] 1.2 Add the board list view and keep `view=list` in the URL — verify: the list shows the same org filter as the columns
- [ ] 1.3 Add the Connections page and a write grant on ingest tokens — verify: the raw token is returned once, a later list omits it, and the grant is visible

## 2. MCP

- [ ] 2.1 Serve stateless `POST /mcp` with bearer auth, read tools, and write tools scoped to the token's workspace — verify: unit tests cover a missing token, a revoked token, a read-only claim, a claim conflict, and a second workspace's rows staying out of the result
- [ ] 2.2 Document the Grok Bot connector in the README — verify: the README names `/mcp`, streamable HTTP, and the Authorization bearer header

## 3. Verification

- [ ] 3.1 `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `openspec validate --all --strict` pass
