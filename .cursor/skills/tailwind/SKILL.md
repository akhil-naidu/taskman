---
name: tailwind
description: Use when styling taskman with Tailwind CSS v4. Adapted from the public Tailwind v4 docs.
---

# Tailwind CSS

Adapted from the Tailwind CSS v4 docs at <https://tailwindcss.com/docs>. This project already imports Tailwind v4 from the app CSS entry.

## v4 in this repo

- Theme tokens and imports live in CSS (`@import "tailwindcss"`, `@theme`). Do not add a v3 `tailwind.config.js` for new work.
- Prefer utilities on the element. Extract a component when the same cluster is repeated, not a `@apply` layer for one-off layout.
- Use the existing spacing scale. The workspace is dense: small type, `gap` of 1–3, borders over shadows.
- Org color is an inline or variable accent on a mark. Do not paint large surfaces with it.
- Dark is the default. Check light only when a control toggles `data-theme`.

## Responsive

- The shell is a sidebar from the `md` breakpoint up and a compact bar below that.
- Do not hide the only path to Fleet, Board, or Connections on a small screen.
