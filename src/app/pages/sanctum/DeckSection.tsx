// app/components/Sanctum/DeckSection.tsx
import type { Deck } from '@/app/types/Deck'

interface Props {
  decks: Deck[]
  currentTier: string
  maxDecks: number
  atLimit: boolean
}

export function DeckSection({ decks, currentTier, maxDecks, atLimit }: Props) {
  const tierColors: Record<string, string> = {
    free: '#78716c',
    starter: '#f59e0b', 
    pro: '#eab308'
  }
  
  const tierColor = tierColors[currentTier] || tierColors.free

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 className="section-title">
          🃏 My Decks ({decks.length}/{maxDecks})
        </h2>
      </div>
      
      {/* Upgrade prompt if at limit */}
      {atLimit && (
        <div style={{
          marginBottom: '12px',
          padding: '12px',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '2px solid #d97706',
          borderRadius: '8px'
        }}>
          <div style={{ fontWeight: 'bold', color: '#d97706', marginBottom: '4px' }}>
            🃏 Deck Limit Reached
          </div>
          <div style={{ fontSize: '12px', color: '#92400e' }}>
            You've reached your limit of {maxDecks} {maxDecks === 1 ? 'deck' : 'decks'}.
            All tiers currently support {maxDecks} decks maximum.
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {decks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🃏</div>
            <div className="empty-state-title">No Decks Yet</div>
            <div className="empty-state-text">Create your first Commander deck</div>
            <a href="/deckBuilder" className="empty-state-button">
              Create Deck
            </a>
          </div>
        ) : (
          <>
            {decks.map((deck) => (
              <div key={deck.id} className="game-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="game-card-title">{deck.name}</span>
                  <span className="game-card-badge">Commander</span>
                </div>
                
                {deck.commander && (
                  <div style={{ fontSize: '13px', color: '#d97706', marginBottom: '6px' }}>
                    ⚔️ {deck.commander}
                  </div>
                )}
                
                <div className="game-card-date">
                  Created {new Date(deck.createdAt).toLocaleDateString()}
                </div>
                
                <div className="game-card-footer">
                  <span style={{ color: '#d97706' }}>
                    {deck.totalCards} cards
                    {deck.colors && deck.colors.length > 0 && (
                      <span style={{ marginLeft: '8px' }}>
                        {deck.colors.map(color => {
                          const colorEmojis: Record<string, string> = {
                            W: '⚪',
                            U: '🔵', 
                            B: '⚫',
                            R: '🔴',
                            G: '🟢'
                          }
                          return colorEmojis[color] || ''
                        }).join('')}
                      </span>
                    )}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <a href={`/deckBuilder/${deck.id}`} className="game-link">
                      Edit →
                    </a>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Only show create button if under limit */}
            {!atLimit && (
              <a href="/deckBuilder" className="create-game-button">
                <span className="create-game-icon">➕</span>
                Create New Deck
              </a>
            )}
          </>
        )}
      </div>
    </div>
  )
}