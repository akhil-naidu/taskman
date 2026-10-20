---
name: react-next-app-router
description: Use when writing React or Next.js App Router code in taskman. This Next.js version differs from older training data; read the in-repo Next docs first.
---

# React and Next.js App Router

Adapted from the Next.js App Router docs (<https://nextjs.org/docs/app>) and the guide shipped in `node_modules/next/dist/docs/`. The root `AGENTS.md` block from Next.js still applies.

## Before editing

Read the relevant guide in `node_modules/next/dist/docs/` before using a Next.js API. Heed deprecation notices in that tree.

## Patterns in this repo

- App Router only. Routes live under `app/`. Do not add `pages/`.
- Server Components are the default. Add `"use client"` only for state, effects, or browser-only Convex hooks.
- Keep data loading at the edge of the client boundary. The fleet screen already chooses example snapshot vs Convex there.
- Metadata and the theme bootstrap stay in the root layout.
- Prefer `<Link>` and `useRouter` / `useSearchParams` for org filters so the URL stays shareable. Wrap `useSearchParams` in Suspense, as the existing pages do.

## React

- Do not introduce a second client state library for view state that already lives in the URL.
- Keys on lists are stable ids (`bot.key`, `task.key`), not titles.
- Interactive controls have accessible names. Icon-only buttons need a label.
