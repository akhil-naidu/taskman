# Design

## Context

Fleet rows are stored under one shared scope string. Sync reads `CLICKUP_API_TOKEN` and related ids from the Convex environment. Ingest compares a single shared secret. None of that can isolate two customers.

## Goals / Non-Goals

**Goals:**

- Convex Auth with the password provider, so sign-up does not depend on an email vendor.
- A workspace id on every fleet row, checked against membership in every public function.
- AES-GCM encryption of integration secrets with `TASKMAN_ENCRYPTION_KEY`. Queries that list credentials return a hint, not the secret.
- Paste-a-token for every provider. OAuth authorize and callback only when that provider's platform client id and secret are set.
- Workspace ingest tokens stored as hashes.

**Non-Goals:**

- Production deploy, Railway, or a second Convex deployment.
- Cross-workspace admin impersonation.
- Replacing the fleet and board layout in this change.

## Decisions

- Convex Auth is the auth library. Password sign-up and sign-in do not send email. Password reset stays off until an email provider is approved.
- The active workspace is chosen by the client and checked on the server. The server does not trust a workspace id without a membership row.
- Integration secrets and ingest tokens are different records. Ingest tokens are hashed. Integration secrets are encrypted, because sync must send the original token to the tracker.
- OAuth client id and secret are optional platform env vars. Customer access tokens are never env vars.
- The push script takes the workspace ingest token as `--token`. It does not read a platform ingest secret.

## Risks / Trade-offs

- Existing dev data has no workspace id. The dev deployment is reset to the new schema rather than migrated in place. There is no production data.
- OAuth buttons do nothing useful until platform client credentials exist. Paste still connects a workspace.
- Decrypt happens inside the sync action. The plaintext token is not written to logs or returned to the client.
