# Spec Delta

## ADDED Requirements

### Requirement: Deployable module paths

A Convex module path component SHALL contain only letters, numbers, underscores, and periods. A pull request SHALL fail when a file under `convex/` would bundle to a path that breaks that rule.

#### Scenario: Hyphenated module

- **WHEN** a Convex source file would bundle as `model/setup-prompt.js`
- **THEN** the pull request check fails

#### Scenario: Camel case module

- **WHEN** the setup prompt module bundles as `model/setupPrompt.js`
- **THEN** the path check passes

### Requirement: Typecheck without a deployment

Pull request CI SHALL typecheck Convex functions with `npx convex typecheck` and SHALL NOT push functions to a deployment.

#### Scenario: Pull request

- **WHEN** a pull request runs CI
- **THEN** Convex functions are typechecked locally
- **AND** no Convex deployment is updated

### Requirement: Functions publish before the web build

The release image build SHALL run `npx convex deploy` with `CONVEX_DEPLOY_KEY` before `pnpm build`. After the push, the build SHALL confirm `workspaces:reset` is a public function. A failed push or a missing function SHALL fail the image build.

#### Scenario: Reset is missing

- **WHEN** the function list after the push does not include public `workspaces:reset`
- **THEN** the image build fails

#### Scenario: Push fails

- **WHEN** `npx convex deploy` exits with an error
- **THEN** `pnpm build` does not run and the image build fails

### Requirement: Request-time auth shell

When the public Convex URL is set, the root layout SHALL wait for the incoming request before rendering the Convex Auth server provider, so prerender of `/` and `/signin` does not call `Date.now()`.

#### Scenario: Sign-in prerender

- **WHEN** `/signin` is requested with the public Convex URL set
- **THEN** the server log does not report a `Date.now()` prerender error

#### Scenario: Home prerender

- **WHEN** `/` is requested with the public Convex URL set
- **THEN** the server log does not report a `Date.now()` prerender error
