# @qntbr/ui

The QNTBR design system, extracted from the codeSplitter look: hairlines, lots of white,
one orange accent, and paper tiles with a faint grain (Infinite Craft's shape). Light by
default, dark via the OS or `<html data-theme="dark">`.

## Use it

It is a pnpm workspace package. In a consuming app:

```jsonc
// package.json
"dependencies": { "@qntbr/ui": "workspace:*" }
```

Load the stylesheet once (RedwoodSDK: in `Document.tsx`) and the Geist fonts:

```tsx
import uiStyles from "@qntbr/ui/styles.css?url";
<link rel="stylesheet" href={uiStyles} />
```

```tsx
import { Page, TopBar, SectionHead, Tile, Button, CraftCanvas } from "@qntbr/ui";
```

## What's in it

| Export | What |
|---|---|
| `Page`, `Wrap` | page surface (applies the tokens) and centered column |
| `TopBar`, `BrandMark`, `Footer` | chrome |
| `SectionHead` | eyebrow + title + lede + optional link |
| `Tile` | the card: paper, accent stripe, glyph, status pill, optional wide layout |
| `Button`, `Badge`, `StatusPill` | paper-tile controls and labels |
| `ThemeScript`, `ThemeToggle` | no-flash light/dark with a remembered choice (client) |
| `CraftCanvas` | Infinite Craft style bag + dotted canvas: drag tiles out, drop them back to put away (client) |
| `CraftWorkspace` | Infinite Craft as a whole page: full-window canvas, a searchable, sortable bag down the right, drop one tile on another to combine (`combine(a, b)` returns a new tile, a toast, a side effect or a link), double-click to copy, layout and discoveries saved under `storageKey` (client) |
| `Sheet` | a paper panel over the page; Escape or the scrim closes it (client) |

Everything is prefixed `q-` / `--q-` so it coexists with Tailwind. Retheme by overriding
`--q-accent`, `--q-accent-ink`, `--q-accent-soft`; a single tile can carry its own accent via `accent`.

Components are server-safe unless marked client. The package ships source (no build step); the
consuming Vite build compiles it.
