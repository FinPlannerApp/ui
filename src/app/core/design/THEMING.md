# Theming & responsive contract

## Add a theme (one file)
1. Copy `core/themes/theme-dark.css` → `theme-<name>.css`, change the selector to `[data-theme="<name>"]`, edit the palette.
2. `@import` it in `styles.css`.
3. Add `{ id, label, icon, mode }` to `ThemeEngine.themes` (`core/services/theme.ts`).

A theme only sets the **palette** variables: `--bg-gradient-1..4`, `--glass-bg`, `--glass-bg-solid`, `--glass-border`,
`--glass-shadow`, `--text-main`, `--text-muted`, `--primary-color`, `--secondary-color`, `--accent-color`,
`--input-*`, `--table-*`, `--button-*`. Everything else (spacing, type, radius, motion, z-index) lives in `core/design/tokens.css`
and is shared, so themes cannot break layout.

## Build a page (no per-page media queries)
- Wrap in `.page .page-stack`; start with `<app-page-header title="…" backLink="/app/dashboard">actions</app-page-header>`.
- Card grids: `.grid-auto` (`.sm` / `.lg` change the minimum card width).
- Rows that must wrap: `.cluster` / `.cluster-between`.
- Tables: wrap in `.table-responsive`, or add `.table-cards` and `data-label="Column"` on each `<td>` to turn rows into cards on phones.
- Dialogs become bottom sheets under 640 px automatically.
- Need to branch in TypeScript? inject `ViewportService` (`isCompact()`, `isDesktop()`, `isTouch()`); in CSS use `html[data-bp]`, `html[data-input]`, `html[data-density]`.
- z-index: only `--z-*` tokens.
