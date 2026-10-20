---
name: conventional-commits
description: Use when writing a commit message, pull request title, or squash-merge title. Follow Conventional Commits.
---

# Conventional Commits

Write every commit subject as `type(scope): subject` or `type: subject`.

## Types

- `feat`: a user-visible capability
- `fix`: a bug fix
- `docs`: documentation only
- `chore`: tooling, deps, or other maintenance
- `refactor`: behavior-preserving code change
- `test`: tests only
- `ci`: continuous integration or automation
- `perf`: a performance improvement
- `build`: the build system or bundling

## Subject

- Scope is optional. Use a short noun when the change has one area, as in `feat(board): add column filters`.
- Use the imperative mood: `add`, `fix`, `remove`. Do not use past tense or a trailing period.
- Keep the subject to one line.

## Breaking changes

When the change breaks existing callers, add a footer:

```
BREAKING CHANGE: describe what changed and what callers must do
```

A breaking change can also use `type!:` or `type(scope)!:` in the subject.

## Pull requests

Pull request titles and squash-merge titles use the same form as the commit subject. The squash commit on the base branch is the message people will read later.
