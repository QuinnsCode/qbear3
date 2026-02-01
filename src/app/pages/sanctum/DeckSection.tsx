// app/pages/sanctum/DeckSection.tsx
import type { Deck } from '@/app/types/Deck'

interface Props {
  decks: Deck[]
  currentTier: string
  maxDecks: number
  atLimit: boolean
}

export function DeckSection({ decks, currentTier, maxDecks, atLimit }: Props) {
  // Separate draft decks from constructed decks
  const draftDecks = decks.filter(deck => deck.format?.toLowerCase() === 'draft')
  const constructedDecks = decks.filter(deck => deck.format?.toLowerCase() !== 'draft')

  return (
    <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
      {/* Constructed Decks Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span></span>
            <span>My Decks</span>
          </h2>
          <span className="text-sm bg-slate-700 text-gray-300 px-3 py-1 rounded-full font-medium border border-slate-600">
            {constructedDecks.length}
          </span>
        </div>

        {constructedDecks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🃏</div>
            <div className="text-xl font-semibold text-gray-200 mb-2">No Decks Yet</div>
            <div className="text-gray-400 mb-4">Create your first Commander deck</div>
            <a
              href="/deckBuilder"
              className="inline-block mt-4 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg"
            >
              Create Deck
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Scrollable constructed deck list */}
            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
              {constructedDecks.map((deck) => (
                <DeckCard key={deck.id} deck={deck} />
              ))}
            </div>

            {/* Create button - outside scroll */}
            {!atLimit && (
              <a
                href="/deckBuilder"
                className="flex items-center justify-center gap-3 p-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold border-2 border-dashed border-slate-500 hover:border-blue-500 transition-all group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">➕</span>
                <span>Create New Deck</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Draft Decks Section */}
      {draftDecks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-600">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>📦</span>
              <span>Draft Decks</span>
            </h2>
            <span className="text-sm bg-slate-700 text-gray-300 px-3 py-1 rounded-full font-medium border border-slate-600">
              {draftDecks.length}
            </span>
          </div>

          {/* Scrollable draft deck list */}
          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            {draftDecks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </div>
        </div>
      )}

      {/* Limit warning */}
      {atLimit && (
        <div className="mt-4 bg-red-900/30 border-2 border-red-500 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl mb-2">🔒</div>
            <div className="font-bold text-red-400 mb-1">
              Deck Limit Reached
            </div>
            <div className="text-sm text-red-300">
              You have {maxDecks} {maxDecks === 1 ? 'deck' : 'decks'} (maximum)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Extracted deck card component for reuse
function DeckCard({ deck }: { deck: Deck }) {
  return (
    <div className="bg-slate-700/70 rounded-lg border border-slate-600 p-4 hover:border-blue-500 hover:shadow-lg transition-all">
      <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
        <span className="text-lg font-bold text-white">{deck.name}</span>
        <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/50 text-blue-300 rounded-full text-xs font-semibold">
          {deck?.format || ''}
        </span>
      </div>

      {deck && deck?.commanders && deck.commanders?.length > 0 && (
        <div className="text-sm text-gray-300 mb-3 font-medium">
          ⚔️ {deck.commanders?.join(' + ')}
        </div>
      )}

      <div className="text-sm text-gray-400 mb-3">
        Created {new Date(deck.createdAt).toLocaleDateString()}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-gray-300 text-sm font-medium flex items-center gap-2">
          <span>{deck.totalCards} cards</span>
          {deck.colors && deck.colors.length > 0 && (
            <span>
              {deck.colors.map(color => {
                const colorEmojis: Record<string, string> = {
                  W: '⚪', U: '🔵', B: '⚫', R: '🔴', G: '🟢'
                }
                return colorEmojis[color] || ''
              }).join('')}
            </span>
          )}
        </span>
        <a
          href={`/deckBuilder/${deck.id}`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
        >
          Edit →
        </a>
      </div>
    </div>
  )
}