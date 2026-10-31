# @qntbr/ui

The QNTBR design system, extracted from the codeSplitter look: hairlines, lots of white,
one orange accent, and paper tiles with a faint grain (Infinite Craft's shape). Colour sits
at about 90/7/3: paper and ink nearly everywhere, a little ink-panel work (primary buttons,
the terminal), the accent only where something is live or just happened. No dot grids.
Light by default, dark via the OS or `<html data-theme="dark">`.

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
import { Page, TopBar, SectionHead, Tile, Button, CraftWorkspace } from "@qntbr/ui";
```

## What's in it

| Export | What |
|---|---|
| `Page`, `Wrap` | page surface (applies the tokens) and centered column |
| `TopBar`, `BrandMark`, `Footer` | chrome |
| `SectionHead` | eyebrow + title + lede + optional link |
| `Tile`, `TileGroup` | the card: paper, preview window, status pill, optional wide or compact layout; and the card that holds cards |
| `Button`, `Badge`, `StatusPill` | paper-tile controls and labels |
| `ThemeScript`, `ThemeToggle` | no-flash light/dark with a remembered choice (client) |
| `CraftWorkspace` | Infinite Craft: a canvas (the whole window, or a box in the page with `className="q-inset"`), a searchable, sortable bag down the right, drop one tile on another to combine (`combine(a, b)` returns a new tile, a toast, a side effect or a link; `nothing(a, b)` words a dud), double-click to copy, layout and discoveries saved under `storageKey`; `onSay` hands every line to the page instead of toasting it (client) |
| `Terminal` | a control-room readout: ink panel, mono lines, blinking cursor; give it `lines` and it shows them, newest in view |
| `Sheet` | a paper panel over the page; Escape or the scrim closes it (client) |

Everything is prefixed `q-` / `--q-` so it coexists with Tailwind. Retheme by overriding
`--q-accent`, `--q-accent-ink`, `--q-accent-soft`.

Components are server-safe unless marked client. The package ships source (no build step); the
consuming Vite build compiles it.
