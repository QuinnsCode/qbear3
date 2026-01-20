// app/components/Sanctum/DeckSection.tsx
import type { Deck } from '@/app/types/Deck'

interface Props {
  decks: Deck[]
  currentTier: string
  maxDecks: number
  atLimit: boolean
}

export function DeckSection({ decks, currentTier, maxDecks, atLimit }: Props) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>🃏</span>
          <span>My Decks</span>
        </h2>
        <span className="text-sm bg-slate-700 text-gray-200 px-3 py-1 rounded-full font-medium border border-slate-600">
          {decks.length}/{maxDecks}
        </span>
      </div>
      
      <div className="space-y-3">
        {decks.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-lg border-2 border-dashed border-slate-600">
            <div className="text-6xl mb-4">🃏</div>
            <div className="text-xl font-semibold text-gray-200 mb-2">No Decks Yet</div>
            <div className="text-gray-400 mb-6">Create your first Commander deck</div>
            <a 
              href="/deckBuilder" 
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg"
            >
              Create Deck
            </a>
          </div>
        ) : (
          <>
            {decks.map((deck) => (
              <div 
                key={deck.id} 
                className="bg-slate-300/90 rounded-lg border border-slate-400 p-4 hover:border-amber-500 hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                  <span className="text-lg font-bold text-slate-900">{deck.name}</span>
                  <span className="px-3 py-1 bg-amber-600/20 border border-amber-500/50 text-amber-700 rounded-full text-xs font-semibold">
                    {deck?.format || ''}
                  </span>
                </div>
                
                {deck.commanders?.length > 0 && (
                  <div className="text-sm text-amber-700 mb-3 font-medium">
                    ⚔️ {deck.commanders?.join(' + ')}
                  </div>
                )}
                
                <div className="text-sm text-slate-600 mb-3">
                  Created {new Date(deck.createdAt).toLocaleDateString()}
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 text-sm font-medium flex items-center gap-2">
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
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Edit →
                  </a>
                </div>
              </div>
            ))}
            
            {/* Show create button or limit message */}
            {atLimit ? (
              <div className="bg-slate-300/60 rounded-lg border-2 border-dashed border-amber-500 p-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">🔒</div>
                  <div className="font-bold text-amber-700 mb-1">
                    Deck Limit Reached
                  </div>
                  <div className="text-xs text-amber-800">
                    You have {maxDecks} {maxDecks === 1 ? 'deck' : 'decks'} (maximum)
                  </div>
                </div>
              </div>
            ) : (
              <a 
                href="/deckBuilder" 
                className="flex items-center justify-center gap-3 p-4 bg-slate-300/40 hover:bg-slate-300/60 text-slate-800 rounded-lg font-semibold border-2 border-dashed border-slate-400 hover:border-amber-500 transition-all group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">➕</span>
                <span>Create New Deck</span>
              </a>
            )}
          </>
        )}
      </div>
    </div>
  )
}