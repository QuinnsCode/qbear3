// app/pages/draft/deck/DraftDeckEditorPage.tsx
import { type RequestInfo } from "rwsdk/worker"
import { env } from "cloudflare:workers"
import DraftDeckEditorClient from './DraftDeckEditorClient'
import { getDeck } from '@/app/serverActions/deckBuilder/deckActions'

export default async function DraftDeckEditorPage({ params, ctx }: RequestInfo) {
  const deckId = params.deckId

  if (!ctx.user?.id) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-400 mb-4">❌ Login Required</h1>
          <p className="text-gray-400">You must be logged in to edit draft decks.</p>
          <a href="/user/login" className="text-blue-400 hover:underline text-lg mt-4 inline-block">
            Log in
          </a>
        </div>
      </div>
    )
  }

  // Fetch the deck
  const deckResult = await getDeck(ctx.user.id, deckId)

  if (!deckResult.success || !deckResult.deck) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-400 mb-4">❌ Deck not found</h1>
          <a href="/sanctum" className="text-blue-400 hover:underline text-lg">
            Back to Sanctum
          </a>
        </div>
      </div>
    )
  }

  const deck = deckResult.deck

  // Verify it's a draft deck
  if (deck.format?.toLowerCase() !== 'draft') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-400 mb-4">❌ Not a draft deck</h1>
          <p className="text-gray-400 mb-4">This deck is not a draft deck.</p>
          <a href={`/deckBuilder/${deckId}`} className="text-blue-400 hover:underline text-lg">
            Open in regular deck builder
          </a>
        </div>
      </div>
    )
  }

  // Get draft ID from deck metadata (stored in draftMetadata.draftId or top-level draftId)
  const draftId = deck.draftId ?? deck.draftMetadata?.draftId

  if (!draftId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-400 mb-4">❌ Draft ID missing</h1>
          <p className="text-gray-400">This deck is missing draft information.</p>
        </div>
      </div>
    )
  }

  // Fetch draft state from DO
  const id = env.DRAFT_DO.idFromName(draftId)
  const stub = env.DRAFT_DO.get(id)

  let draftState = null

  try {
    const response = await stub.fetch(new Request('https://fake-host/', {
      method: 'GET'
    }))

    if (response.ok) {
      draftState = await response.json()
    }
  } catch (e: any) {
    console.error('Error loading draft:', e)
  }

  if (!draftState) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-400 mb-4">❌ Draft not found</h1>
          <p className="text-gray-400">The original draft could not be loaded.</p>
        </div>
      </div>
    )
  }

  // Find the player's data in the draft
  const player = draftState.players.find((p: any) => p.id === ctx.user!.id)

  if (!player) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-400 mb-4">❌ Not your draft</h1>
          <p className="text-gray-400">You were not a player in this draft.</p>
        </div>
      </div>
    )
  }

  return (
    <DraftDeckEditorClient
      deckId={deckId}
      deckName={deck.name}
      draftId={draftId}
      draftPool={player.draftPool}
      cubeCards={draftState.cubeCards || []}
      playerId={ctx.user.id}
      playerName={ctx.user.name || ctx.user.email || 'Player'}
      initialConfig={player.deckConfiguration}
    />
  )
}
