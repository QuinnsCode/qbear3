# The Table: plan for rebuilding the card game

Status: **draft for discussion.** No code yet. The questions at the bottom need answers before anything is built.

## Goal

Make a Commander table that does what Moxfield and SpellTable do together: build a deck, sit down with three friends, and
play with digital cards, webcams pointed at paper cards, or both at once. Video comes from qlave.dev. The draft stays as
it is.

## Where we are

The Sanctum hub (`src/app/pages/sanctum/`) is fine as a launcher. The problems are in the game behind it
(`src/cardGameDurableObject.ts`, `src/app/services/cardGame/`, `src/app/components/CardGame/`):

| Area | Today |
|---|---|
| Actions | Each one is a `"use server"` RPC that does an HTTP POST to the DO. The WebSocket only carries ping and cursors. |
| Fan-out | Every action sends the **whole state** to every socket. That includes full Scryfall objects for each deck (hundreds of KB per move) and every hand and library order. |
| Deltas | `DeltaManager` switches on `MOVE_CARD` and similar, but the actions are named `move_card`, so it never matches. The deltas are dead weight. |
| Persistence | Each action rewrites one `cardGameState` blob, plus a `gameActions` array that grows without limit and is rewritten every time. |
| Hibernation | The DO uses the API, but activity tracking lives in memory, and broadcasts skip sockets idle for 5 minutes, so quiet players miss updates. |
| Ordering | No seq numbers, versions or resume. A mulligan is N separate RPCs. Reconnect is a fixed 3 s retry followed by a full GET. |
| Rendering | Absolutely positioned DOM cards. The mobile and desktop layouts are both mounted and toggled with CSS. Scryfall image URLs are hotlinked. `legacy/` is still half live. |
| Rules surface | Half done: commander damage and counters stored as a JSON string, card counters and attachments that exist only as types, rewind as a stub. Missing: turn and phase tracking, stack, scry and search, chat. |
| Identity | Needs a separate fix before anything else ships. See "Phase 0". |

Draft (`src/draftDurableObject.ts`) is built the same way (HTTP actions, a whole blob, full broadcasts), but it works
and its payload is small. We leave it alone.

## What Rusty Buns' games do, and what we take from each

None of the games share a netcode package. Each one copies the same pattern. These are the parts that fit a card table:

| From | Pattern | Use here |
|---|---|---|
| hippo-tycoon `room-do.ts` + `engine/room.ts` | A thin DO wrapper around a platform-free `Room` that sees only `EngineCtx`, `EngineSocket` and `Clock`. Restore runs inside `blockConcurrencyWhile`. | The rules engine never touches Cloudflare, so it is unit-testable and runs offline in the desktop build. |
| hippo `engine/wire.ts` | `decodeClient(raw): ClientMsg \| null`: length cap, guarded `JSON.parse`, `switch (m.t)`, a fresh object rebuilt field by field. `{t:"hello", v}` comes first, and nothing counts before it. | Exactly this, for every intent. AGENTS.md "check what comes in" for free. |
| hippo | Close codes 4000 version, 4001 replaced (same user, another tab), 4003 full, 4008 flood. A per-socket `TokenBucket`. | Same codes and limits. |
| hippo `client/net.ts`, shell-bun `resilientSocket` | Backoff `min(500·2ⁿ, 15 s)`, the URL rebuilt on each try, a ping every 2 s, a clean close on `pagehide`. | Replaces `useCardGameSync`'s reconnect. |
| hippo / skate | Per-socket identity kept in `serializeAttachment`. The player list is derived from `getWebSockets()` and never held in memory. | Fixes the lost-after-hibernation bug by construction. |
| hippo worker | The edge strips every client `x-*` header and sets its own identity headers. "The world never trusts a message body." | Identity comes from the session, never from an argument. |
| two-fronts `edge/campaign.ts` | Turn-based. SQLite tables. Seat tokens stored only as hashes. The server sends `fogged(state, seat)`. | Per-seat views: your hand is yours, library order is nobody's. |
| hippo spectators | A socket with no seat watches (`you: -1`, capped), and "Sit here" takes an empty seat. | Spectators, and filling an open seat. |
| hippo `test/fakes.ts` | `FakeSocket`, `FakeCtx`, `ManualClock`. Tests cover version refusal, hostile bodies, flood and replace. `smoke-evict.ts` evicts mid-game. | The test bed for the room. |
| hippo render | Quality presets (low/med/high), `setPixelRatio(min(dpr,2))`, a draw-call budget, a reduced-motion default, `parseSettings` restoring field by field. | The graphics pass. |
| ACCESSIBILITY.md | Anything you can drag has a non-pointer way to do it. Never colour alone. 4.5:1 contrast. | Keyboard and menu equivalents for every card action. |

Rusty Buns has no WebRTC or video at all. qlave is new ground.

## Proposal: build a new table next to the old one, then switch over

Patching the old game doesn't get us there. The state shape, the RPC path and the full broadcast are its foundations, and
we would have to change all three. Rebuilding everything in one go would leave nothing playable for weeks. Instead:

- A new `TableDO` (new binding) at `/table/:id`, with its own `/__table` socket.
- `CardGameDO` keeps serving existing games until the new table is good enough, then Sanctum's "New game" switches over.
- The old games, the card game half of `legacy/`, `DeltaManager`/`DeltaApplicator`, `WebSocketManager.ts` and the dead
  Sanctum files then get deleted in one PR.

Reused as they are: the deck builder and deck storage, `DeckImportManager`'s parser, `TokenManager`'s token lookup,
`CardCacheDO`, presence, friends and invites, and Sanctum's tiles.

### State and storage (SQLite in the DO)

```
table   (id, format, phase, turn, active_seat, step, seq, created_at)
seats   (seat, user_id, name, life, poison, commander_tax, cam_mode)   -- cam_mode: digital | webcam | hybrid
cards   (iid, seat_owner, seat_ctrl, oracle_id, print_id, zone, pos, x, y, tapped, face, flipped, counters_json, attached_to)
cmd_dmg (from_seat, to_seat, dmg)
events  (seq, at, seat, kind, body_json)       -- append-only; drives the log, undo and resume
```

- A card stores only `print_id` and `oracle_id`. Scryfall data is fetched once per table through `CardCacheDO` and sent
  to clients as a separate, cacheable card catalog, not inside every update.
- Images go through our own `/img/:print_id` proxy with long-lived cache headers, not hotlinked.
- Hidden zones (library, hand, face-down cards) are real per-seat filters. Peeking (scry, search, "look at the top N")
  gives that seat alone a time-limited view.

### Wire

```
client → {t:"hello", v, resume?: seq}
         {t:"do", id, intent}      intent ∈ move | tap | untap_all | flip | counter | attach | draw | mill | scry | search |
                                            shuffle | mulligan | life | cmd_dmg | phase | pass | reveal | token | undo | chat
server → {t:"welcome", you, seq, view}    the full view for this seat (the catalog is sent separately)
         {t:"ev", seq, ev}               one event, already filtered for this seat
         {t:"ack", id} / {t:"nack", id, why}
```

- Intents are things a player means to do ("mulligan to 6"), not lists of state edits. One intent is one transaction
  and one event, so no more N RPCs.
- The client applies its own intent at once to a local copy and reconciles when the ack or nack comes back. That makes
  card drags feel instant.
- On `hello` with `resume`, the server replays events after that seq if it still has them, otherwise it sends a fresh
  `welcome`.

### Graphics

Proposal: a **three.js table with a DOM layer on top**, the stack Rusty Buns' games use.

- **Scene:** the felt or playmat, each seat's battlefield, cards as textured quads (instanced, one atlas per table),
  tap rotation and draw arcs animated in the scene, a light bloom on targeting arrows. Low, medium and high presets.
- **DOM layer:** the hand, menus, the hover or long-press card zoom (crisp text from the full-size image), the life and
  counters HUD, the log and chat, video tiles. The DOM also carries focus and keyboard actions, so accessibility does
  not depend on the canvas.
- **Phone:** one battlefield at a time with a swipe between seats (the minimap idea from today's board), and only one
  layout mounted.

The fallback, if we would rather not take on WebGL: DOM cards drawn with CSS 3D transforms and FLIP animations. It
ships faster, but there is less room for "way better".

### Video (qlave.dev)

- Each table gets a qlave room. `TableDO` creates it, or derives its id, and hands each seated player a short-lived join
  token in `welcome`.
- Each seat tile shows that player's webcam next to their battlefield, with mute and camera controls in the DOM layer.
- `cam_mode` per seat:
  - **digital**: cards on the table, video as a face cam.
  - **webcam**: SpellTable style, a top-down camera on paper cards, with the battlefield replaced by the video. Life,
    commander damage, turn and the log still run on the table.
  - **hybrid**: a mix of the two.
- Later: click a card in someone's webcam feed to identify it (SpellTable's best feature). That needs card recognition
  and is its own project.

## Phases

0. **Identity fix on today's game** (small, ships first, separate PR). Details go to the owner directly and not in this
   public doc.
1. **Room core:** `TableDO`, the wire, the SQLite schema, per-seat views, and hippo-style fakes with room tests (hostile
   bodies, hidden zones, resume, replace, evict). It is playable with a plain DOM board.
2. **Rules surface:** turn and phase, pass priority, counters, attach, commander damage and tax, scry and search, undo,
   chat and log, spectators, "sit here".
3. **Graphics:** the three.js table, the DOM overlay, the phone layout, presets, reduced motion.
4. **Video:** qlave rooms, seat tiles, the webcam and hybrid modes.
5. **Switchover:** Sanctum creates tables, `CardGameDO` and the dead code are deleted, the e2e journey is "create, invite,
   seat four, play a turn".
6. **The Moxfield side** (a separate track): public deck pages, import from Moxfield or Archidekt URLs, legality and
   bracket checks, a price column, playtest (a solo table straight from a deck).

## Questions for the owner

1. **Tear up or run side by side?** Is there anyone playing on the current card game who would notice a switchover? If
   not, we could skip running both and replace it in place.
2. **qlave's interface:** is there an embed or iframe, a JS SDK, or a room API with tokens? Can a Worker mint a room or
   a token, and with what secret?
3. **Graphics:** a three.js table (proposed), or CSS 3D cards?
4. **How strict on rules:** a free-form table where players enforce the rules (SpellTable, untap-style), or some engine
   help, such as auto-untap on your turn, phase stops, or a commander tax counter? The proposal is free form plus
   helpers, never a rules engine.
5. **Formats:** Commander only to start, or 1v1 (60-card) as well?
6. **Desktop and LAN:** should the table be playable offline or on a LAN through the Rusty Buns binary? That pushes even
   harder for the platform-free `Room`.
