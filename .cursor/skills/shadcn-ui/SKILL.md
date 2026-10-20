---
name: shadcn-ui
description: Use when adding or composing shadcn/ui components, theming, or the taskman dense dark workspace (sidebar, command palette, list and board). Adapted from the public shadcn/ui docs.
---

# shadcn/ui

Adapted from the public docs at <https://ui.shadcn.com/docs>. This is a project skill, not an official shadcn package.

## Use

- Add components with the shadcn CLI (`pnpm dlx shadcn@latest add <name>`). Keep generated files in `components/ui`.
- Compose product UI outside `components/ui`. Do not fork a primitive to change one screen.
- Icons come from the set the project already uses. Do not add a second icon package for one button.
- This app is Tailwind v4. Follow the CLI's CSS setup. Do not add a Tailwind v3 `tailwind.config.js` beside it.

## Taskman theme

The workspace is dense and keyboard-first, in the spirit of Linear:

- Dark is the default. A light theme may exist, but dark is the one that must look finished.
- Sidebar navigation, not a top-only nav.
- Command palette on Cmd-K / Ctrl-K.
- List and board views of the same tasks.
- Subtle borders, tight type, little shadow.
- Monochrome surfaces. Org color is the only accent, used on a small mark (dot, bar, or badge), not as a fill for whole panels.

## Checks

- Keyboard: palette opens, moves, and runs a command without a pointer.
- Empty, loading, and error states use the same density as the filled state.
- Do not invent a second visual language next to the shell.
