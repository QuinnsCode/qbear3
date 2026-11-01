// app/pages/sanctum/SanctumClient.tsx
// The Sanctum as an Infinite Craft board: everything you have (decks, games, friends, places) is a
// tile in the bag. Click a tile to open it; drop one on another to do the thing the pair means.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrandMark, CraftWorkspace, Sheet, ThemeScript, ThemeToggle, type CraftResult, type WorkspaceItem } from '@qntbr/ui'
import { SettingsSection } from './SettingsSection'
import { FriendsModal } from '@/app/components/Social/FriendsModal'
import { PresenceHeartbeat } from '@/app/components/Social/PresenceHeartbeat'
import { LogoutButton } from '@/app/pages/user/LoginButton'
import { deleteDeck } from '@/app/serverActions/deckBuilder/deckActions'
import { deleteCardGame } from '@/app/serverActions/cardGame/cardGameActions'
import { acceptFriendRequest, rejectFriendRequest, type Friend, type FriendRequest } from '@/app/serverActions/social/friends'
import { acceptGameInvite, declineGameInvite, sendGameInvite, type GameInvite } from '@/app/serverActions/social/gameInvites'
import type { Presence, UserPresence } from '@/app/serverActions/social/presence'
import type { Deck } from '@/app/types/Deck'

interface Props {
  userDecks: Deck[]
  activeGames: any[]
  friends: Friend[]
  friendRequests: { incoming: FriendRequest[]; outgoing: FriendRequest[] }
  gameInvites: { received: GameInvite[]; sent: GameInvite[] }
  friendPresence?: Record<string, UserPresence>
  currentTier: string
  tierLimits: {
    maxGames: number
    maxPlayers: number
    maxDecks: number
  }
  userId: string
  userName?: string
  organizationName?: string
  orgSlug: string
}

type Panel = 'inbox' | 'settings' | 'news' | 'friends' | null
type Doomed = { kind: 'deck' | 'game'; id: string; name: string }

const GROUPS = [
  { id: 'play', label: 'Play' },
  { id: 'games', label: 'Your games' },
  { id: 'decks', label: 'Your decks' },
  { id: 'friends', label: 'Friends' },
  { id: 'places', label: 'Places' },
]

const PANELS: Record<string, Panel> = { 'place:inbox': 'inbox', 'place:settings': 'settings', 'place:news': 'news', 'place:friends': 'friends' }
const COLOR_GLYPH: Record<string, string> = { W: '☀️', U: '💧', B: '💀', R: '🔥', G: '🌳' }
const PRESENCE_GLYPH: Record<Presence, string> = { online: '🟢', away: '🟡', offline: '⚪' }

const FEATURES = [
  { category: 'Deck Building', items: ['Commander decks with search by name, type, or ability', 'Import decks from text lists', 'Color distribution and mana curve'] },
  { category: 'Card Games', items: ['Multiplayer Commander with real-time sync', 'Undo and redo', 'Life, commander damage and poison tracking', 'Sandbox mode, no login'] },
  { category: 'Draft', items: ['Vintage Cube drafts against AI drafters', 'PVP matchmaking after the draft', 'Drafted decks saved for later'] },
  { category: 'Social', items: ['Friends with online status', 'Game invites', 'Join friends’ games directly'] },
  { category: 'Coming soon', items: ['Spectator improvements', 'Tournaments and leagues', 'Player statistics'] },
]

// Item ids are namespaced by kind, so a recipe can tell a deck from a game from a friend.
const kind = (it: WorkspaceItem) => it.id.split(':')[0]
const ref = (it: WorkspaceItem) => it.id.slice(it.id.indexOf(':') + 1)

function deckHref(deck: Deck) {
  return deck.format === 'draft' ? `/draft/deck/${deck.id}` : `/deckBuilder/${deck.id}`
}

export function SanctumClient({
  userDecks,
  activeGames,
  friends,
  friendRequests,
  gameInvites,
  friendPresence = {},
  currentTier,
  tierLimits,
  userId,
  userName,
  organizationName,
  orgSlug,
}: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  const [doomed, setDoomed] = useState<Doomed | null>(null)
  const [busy, setBusy] = useState(false)
  const [requests, setRequests] = useState(friendRequests.incoming)
  const [invites, setInvites] = useState(gameInvites.received)
  const [note, setNote] = useState<string | null>(null)

  // Old links into the sidebar (/sanctum?section=settings) open the matching panel.
  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get('section')
    if (section === 'settings') setPanel('settings')
    else if (section === 'social') setPanel('inbox')
    else if (section === 'announcements') setPanel('news')
  }, [])

  const close = useCallback(() => { setPanel(null); setNote(null) }, [])

  const gameLimit = activeGames.length >= tierLimits.maxGames
  const inboxCount = requests.length + invites.length

  const items = useMemo<WorkspaceItem[]>(() => {
    const out: WorkspaceItem[] = [
      gameLimit
        ? { id: 'place:new-game', group: 'play', glyph: '🔒', label: 'New Game', href: '/pricing', hint: `You have ${activeGames.length} of ${tierLimits.maxGames} games. Upgrade for more.` }
        : { id: 'place:new-game', group: 'play', glyph: '✨', label: 'New Game', href: '/cardGame', hint: 'Start a Commander table' },
      { id: 'place:pvp', group: 'play', glyph: '⚔️', label: 'PVP Arena', href: '/pvp', hint: 'Draft vs AI, then fight a real player' },
      { id: 'place:draft', group: 'play', glyph: '📦', label: 'New Draft', href: '/draft/new', hint: 'Draft a cube' },
    ]
    for (const g of activeGames) {
      out.push({
        id: `game:${g.cardGameId}`, group: 'games', glyph: '🎲', label: g.name, href: `/cardGame/${g.cardGameId}`,
        badge: `${g.playerCount}/${tierLimits.maxPlayers}`, order: Date.parse(g.lastActivity) || 0,
        hint: 'Drop a friend here to invite them. Drop on Trash to destroy.',
      })
    }
    for (const d of userDecks) {
      const glyph = d.format === 'draft' ? '📦' : (d.colors?.length ? d.colors.map((c) => COLOR_GLYPH[c] ?? '').join('') : '🃏') || '🃏'
      out.push({
        id: `deck:${d.id}`, group: 'decks', glyph, label: d.name, href: deckHref(d),
        order: d.updatedAt || d.createdAt || 0,
        hint: 'Drop on a game to play it there. Drop on Trash to delete.',
      })
    }
    const rank: Record<Presence, number> = { online: 0, away: 1, offline: 2 }
    const sorted = [...friends].sort((a, b) =>
      rank[friendPresence[a.friendId]?.presence ?? 'offline'] - rank[friendPresence[b.friendId]?.presence ?? 'offline'] || a.friendName.localeCompare(b.friendName))
    for (const f of sorted) {
      const p = friendPresence[f.friendId]?.presence ?? 'offline'
      out.push({ id: `friend:${f.friendId}`, group: 'friends', glyph: PRESENCE_GLYPH[p], label: f.friendName, order: f.createdAt, hint: `${f.friendName} is ${p}. Drop them on a game to invite them.` })
    }
    out.push(
      { id: 'place:friends', group: 'friends', glyph: '➕', label: 'Add Friend', hint: 'Find people by name or email' },
      { id: 'place:builder', group: 'places', glyph: '🛠️', label: 'Deck Builder', href: '/deckBuilder', hint: 'Build a new deck' },
      { id: 'place:community', group: 'places', glyph: '🌐', label: 'Community', href: '/community', hint: 'Decks everyone else is brewing' },
      { id: 'place:inbox', group: 'places', glyph: '📨', label: 'Inbox', badge: inboxCount, alert: true, hint: 'Friend requests and game invites' },
      { id: 'place:news', group: 'places', glyph: '📣', label: 'What’s New' },
      { id: 'place:pricing', group: 'places', glyph: '💎', label: 'Pricing', href: '/pricing' },
      { id: 'place:settings', group: 'places', glyph: '⚙️', label: 'Settings' },
      { id: 'place:trash', group: 'places', glyph: '🗑️', label: 'Trash', hint: 'Drop a deck or a game here to get rid of it' },
    )
    return out
  }, [activeGames, userDecks, friends, friendPresence, gameLimit, inboxCount, tierLimits])

  const combine = useCallback((a: WorkspaceItem, b: WorkspaceItem): CraftResult | null => {
    const ka = kind(a), kb = kind(b)
    if (ka === 'friend' && kb === 'game') {
      return {
        keep: true,
        message: `Inviting ${a.label} to ${b.label}…`,
        run: async () => {
          const r = await sendGameInvite(userId, ref(a), ref(b), 'card', `/cardGame/${ref(b)}`)
          return r.success ? `${a.label} is invited to ${b.label}.` : r.message
        },
      }
    }
    if (ka === 'friend' && b.id === 'place:new-game') {
      return { keep: true, message: `Make the game first, then drop ${a.label} on it.` }
    }
    if (ka === 'deck' && kb === 'game') {
      return { keep: true, message: `Taking ${a.label} to ${b.label}. Pick it from your decks at the table.`, href: b.href }
    }
    if (ka === 'deck' && b.id === 'place:new-game' && !gameLimit) {
      return { keep: true, message: `New table for ${a.label}. Pick it from your decks once you’re in.`, href: '/cardGame' }
    }
    if (ka === 'deck' && b.id === 'place:builder') return { keep: true, href: a.href, message: `Opening ${a.label}…` }
    if ((ka === 'deck' || ka === 'game') && b.id === 'place:trash') {
      return { keep: true, run: () => setDoomed({ kind: ka, id: ref(a), name: a.label }) }
    }
    // Two discoveries that are just good places to be.
    if (a.id === 'place:draft' && b.id === 'place:pvp') {
      return { item: { id: 'found:duel', glyph: '🏟️', label: 'Draft Duel', href: '/pvp', hint: 'Draft, then duel' }, message: 'New discovery: Draft Duel' }
    }
    if (a.id === 'place:builder' && b.id === 'place:community') {
      return { item: { id: 'found:library', glyph: '📚', label: 'Deck Library', href: '/community', hint: 'Steal a list' }, message: 'New discovery: Deck Library' }
    }
    return null
  }, [userId, gameLimit])

  const onOpen = useCallback((it: WorkspaceItem) => {
    const p = PANELS[it.id]
    if (!p) return false
    setPanel(p)
    return true
  }, [])

  const destroy = async () => {
    if (!doomed) return
    setBusy(true)
    try {
      const r = doomed.kind === 'deck' ? await deleteDeck(userId, doomed.id) : await deleteCardGame(doomed.id)
      if (r.success) window.location.reload()
      else { setNote(r.error || 'That did not work.'); setBusy(false) }
    } catch {
      setNote('That did not work.')
      setBusy(false)
    }
  }

  const answerRequest = async (req: FriendRequest, yes: boolean) => {
    const r = yes ? await acceptFriendRequest(userId, req.id) : await rejectFriendRequest(userId, req.id)
    setNote(r.message)
    if (r.success) setRequests((rs) => rs.filter((x) => x.id !== req.id))
  }

  const answerInvite = async (inv: GameInvite, yes: boolean) => {
    if (yes) {
      const r = await acceptGameInvite(userId, inv.id)
      if (r.success) { window.location.assign(r.gameUrl || inv.gameUrl); return }
      setNote(r.message)
    } else {
      const r = await declineGameInvite(userId, inv.id)
      setNote(r.message)
      if (r.success) setInvites((is) => is.filter((x) => x.id !== inv.id))
    }
  }

  const presenceByUserId = useMemo(
    () => Object.fromEntries(Object.entries(friendPresence).map(([id, p]) => [id, p.presence])) as Record<string, Presence>,
    [friendPresence],
  )

  const seed = [
    'place:new-game',
    ...activeGames.slice(0, 2).map((g) => `game:${g.cardGameId}`),
    ...userDecks.slice(0, 2).map((d) => `deck:${d.id}`),
    'place:pvp',
  ]

  return (
    <>
      <ThemeScript />
      <PresenceHeartbeat userId={userId} />
      <CraftWorkspace
        items={items}
        groups={GROUPS}
        seed={seed}
        storageKey={`qntbr:sanctum:${orgSlug}:${userId}`}
        combine={combine}
        onOpen={onOpen}
        hint="Drag a tile out of the bag. Drop a friend on a game to invite them, a deck on a game to play it."
        corner={
          <>
            <a href="/" className="q-brand" style={{ marginRight: 0 }}>
              <BrandMark /> Sanctum
            </a>
            <span className="q-pill" title="Your lair">{organizationName || orgSlug}</span>
            <a href="/pricing" className="q-pill" data-status="live" style={{ textDecoration: 'none' }} title="Your plan">
              {currentTier} · {userDecks.length}/{tierLimits.maxDecks} decks · {activeGames.length}/{tierLimits.maxGames} games
            </a>
            <span style={{ flex: 1 }} />
            <button type="button" className="q-btn" onClick={() => setPanel('inbox')}>
              📨 Inbox{inboxCount > 0 && <span className="q-item-badge q-alert">{inboxCount}</span>}
            </button>
            <ThemeToggle />
            <LogoutButton className="q-btn q-ghost" redirectTo="/user/login">
              Log out{userName ? ` ${userName}` : ''}
            </LogoutButton>
          </>
        }
      />

      <Sheet open={panel === 'inbox'} onClose={close} eyebrow="Sanctum" title="Inbox">
        {note && <p className="q-muted" role="status">{note}</p>}
        <span className="q-label">Game invites</span>
        {invites.length === 0 ? <p className="q-muted">No pending invites.</p> : (
          <ul className="q-rows" style={{ margin: '6px 0 18px' }}>
            {invites.map((inv) => (
              <li key={inv.id}>
                <span aria-hidden="true">🎲</span>
                <span className="q-grow"><b>{inv.fromUserName}</b> invited you to <b>{inv.gameName}</b></span>
                <button type="button" className="q-btn q-primary" onClick={() => answerInvite(inv, true)}>Join</button>
                <button type="button" className="q-btn" onClick={() => answerInvite(inv, false)}>Decline</button>
              </li>
            ))}
          </ul>
        )}
        <span className="q-label">Friend requests</span>
        {requests.length === 0 ? <p className="q-muted">No requests.</p> : (
          <ul className="q-rows" style={{ margin: '6px 0 18px' }}>
            {requests.map((req) => (
              <li key={req.id}>
                <span aria-hidden="true">👋</span>
                <span className="q-grow"><b>{req.senderName}</b> wants to be friends</span>
                <button type="button" className="q-btn q-primary" onClick={() => answerRequest(req, true)}>Accept</button>
                <button type="button" className="q-btn" onClick={() => answerRequest(req, false)}>Ignore</button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="q-btn" onClick={() => setPanel('friends')}>➕ Find friends</button>
      </Sheet>

      <Sheet open={panel === 'news'} onClose={close} eyebrow="Sanctum" title="What’s new">
        {FEATURES.map((f) => (
          <div key={f.category} style={{ marginBottom: 14 }}>
            <span className="q-label">{f.category}</span>
            <ul className="q-list" style={{ marginTop: 6 }}>
              {f.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </div>
        ))}
      </Sheet>

      <Sheet open={panel === 'settings'} onClose={close} eyebrow="Sanctum" title="Settings" wide>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: 12 }}>
          <SettingsSection />
        </div>
      </Sheet>

      <Sheet open={doomed !== null} onClose={() => { if (!busy) { setDoomed(null); setNote(null) } }} eyebrow="Trash" title={doomed ? `Destroy ${doomed.name}?` : ''}>
        <p className="q-muted" style={{ marginTop: 0 }}>
          {doomed?.kind === 'game'
            ? 'The game ends for everyone at the table. This cannot be undone.'
            : 'The deck and its list are deleted. This cannot be undone.'}
        </p>
        {note && <p role="status" style={{ color: 'var(--q-accent-ink)' }}>{note}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="q-btn q-primary" disabled={busy} onClick={destroy}>{busy ? 'Destroying…' : 'Destroy'}</button>
          <button type="button" className="q-btn" disabled={busy} onClick={() => { setDoomed(null); setNote(null) }}>Keep it</button>
        </div>
      </Sheet>

      <FriendsModal
        isOpen={panel === 'friends'}
        onClose={close}
        userId={userId}
        initialFriends={friends}
        initialRequests={friendRequests}
        presenceByUserId={presenceByUserId}
      />
    </>
  )
}
