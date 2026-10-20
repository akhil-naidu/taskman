# Spec Delta

## Purpose

Lets a password account use Convex after sign-in, and lets the Next.js app prerender while the session cookie is read at request time.

## ADDED Requirements

### Requirement: Convex Auth issuer

The deployment SHALL trust session tokens from its own Convex Auth issuer. The issuer domain SHALL be the deployment site URL, and the token audience SHALL be `convex`.

#### Scenario: Signed-in query

- **WHEN** a password account signs in and calls an authenticated query
- **THEN** the query runs as that account

#### Scenario: Missing session

- **WHEN** a client calls an authenticated query with no session
- **THEN** the call is rejected

### Requirement: Prerender with a session cookie

When the public Convex URL is set, a production build SHALL prerender every App Router route. The session cookie SHALL be read at request time behind a loading placeholder, and that read SHALL NOT fail the build.

#### Scenario: Build with the public URL set

- **WHEN** `next build` runs with the public Convex URL set
- **THEN** `/`, `/board`, `/connections`, `/settings`, `/signin`, and the not-found route prerender successfully

#### Scenario: Build without the public URL

- **WHEN** `next build` runs without the public Convex URL
- **THEN** the same routes prerender successfully
