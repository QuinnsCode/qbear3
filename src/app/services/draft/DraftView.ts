// What one viewer of a draft may see. The Durable Object holds every drafter's packs and pool; the page
// and the socket only ever send this, so a browser never receives a pack that isn't in its own hands.
import type { CubeCard, DraftState } from '@/app/types/Draft'

export type DraftViewMode = 'drafter' | 'spectator'

/**
 * `state` as `viewerId` sees it. A drafter gets their own pack, pool and the cards those name; everyone
 * else at the table is public facts only (name, pool size, whether they've picked). A spectator
 * (`viewerId` null or not seated) gets the public facts alone: no packs, no pools, no cube.
 */
export function viewFor(state: DraftState, cube: CubeCard[], viewerId: string | null, mode: DraftViewMode): DraftState {
  const byId = new Map(cube.map(c => [c.scryfallId, c]))
  const cards = (ids: string[]) => ids.map(id => byId.get(id)).filter((c): c is CubeCard => !!c)
  const picked = state.playersWhoPickedThisRound ?? []
  const seen: CubeCard[] = []

  const players = state.players.map(p => {
    const hasPicked = picked.includes(p.id)
    if (mode === 'drafter' && p.id === viewerId) {
      const pack = cards(p.currentPack?.cards ?? [])
      seen.push(...pack, ...cards(p.draftPool))
      return {
        ...p,
        poolSize: p.draftPool.length,
        hasPicked,
        // The client takes a pack as CubeCards (it also tolerates ids)
        currentPack: p.currentPack ? { ...p.currentPack, cards: pack as unknown as string[] } : undefined,
      }
    }
    return { id: p.id, name: p.name, isAI: p.isAI, open: p.open, draftPool: [], poolSize: p.draftPool.length, hasPicked }
  })

  const { remainingPacks: _packs, cubeCards: _cube, ...rest } = state
  return { ...rest, players, cubeCards: [...new Map(seen.map(c => [c.scryfallId, c])).values()] }
}
