// app/components/CardGame/Zones/ZoneButtons.tsx
'use client'

import { useRef } from 'react'
import { BookOpen, Skull, Flame, Crown, Swords } from 'lucide-react'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'

interface ZoneButtonsProps {
  player: MTGPlayer
  cardGameId: string
  onViewZone: (zone: string) => void
  onSelectBattlefield: () => void
  onOpenLibraryMenu: () => void
  hasNoDeck: boolean | undefined
  onOpenDeckBuilder: () => void
  spectatorMode?: boolean
  isViewingHand?: boolean
  libraryButtonRef: React.RefObject<HTMLButtonElement | null>
}

export default function ZoneButtons({
  player,
  cardGameId,
  onViewZone,
  onSelectBattlefield,
  onOpenLibraryMenu,
  hasNoDeck,
  onOpenDeckBuilder,
  spectatorMode,
  isViewingHand,
  libraryButtonRef
}: ZoneButtonsProps) {
  
  const handleMoveCard = async (cardId: string, fromZone: string, toZone: string) => {
    try {
      applyCardGameAction(cardGameId, {
        type: 'move_card',
        playerId: player.id,
        data: { cardId, fromZone, toZone }
      }).catch(error => {
        console.error('Failed to move card:', error)
      })
    } catch (error) {
      console.error('Failed to move card:', error)
    }
  }

  return (
    <div className="w-64 flex flex-col gap-3">
      {/* Library with menu */}
      <div className="relative">
        <button
          ref={libraryButtonRef}
          onClick={() => hasNoDeck ? onOpenDeckBuilder() : onViewZone('library')}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            if (hasNoDeck) return
            e.preventDefault()
            const cardId = e.dataTransfer.getData('cardId')
            const fromZone = e.dataTransfer.getData('fromZone')
            handleMoveCard(cardId, fromZone, 'library')
          }}
          className={`w-full bg-slate-900 hover:bg-slate-800 border-2 ${
            hasNoDeck ? 'border-yellow-500 animate-pulse' : 'border-slate-700'
          } p-4 rounded-lg hover:scale-105 transition-all shadow-md flex items-center justify-between group relative`}
        >
          <div className="flex items-center gap-3 text-white">
            <BookOpen className={`w-12 h-12 ${
              hasNoDeck ? 'text-yellow-500' : ''
            } group-hover:drop-shadow-[0_0_12px_rgba(59,130,246,0.8)] transition-all`} />
            <div className="flex flex-col items-start">
              {hasNoDeck ? (
                <>
                  <div className="text-xs text-yellow-400 font-semibold">No Assigned Deck</div>
                  <div className="text-sm text-yellow-300">Load Your Deck!</div>
                </>
              ) : (
                <div className="text-3xl font-bold">{player.zones.library.length}</div>
              )}
            </div>
          </div>
          
          {!hasNoDeck && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenLibraryMenu()
              }}
              disabled={spectatorMode}
              className="text-white hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center text-lg transition-colors"
            >
              ⋯
            </button>
          )}
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
            {hasNoDeck ? 'Click to load deck' : 'Library'}
          </div>
        </button>
      </div>
      
      {/* Other zones - 3 in a row */}
      <div className="flex gap-2">
        <ZoneSymbolCard 
          icon={<Skull className="w-8 h-8" />}
          glowColor="rgba(168,85,247,0.8)"
          label="Graveyard"
          count={player.zones.graveyard.length}
          size="small"
          onClick={() => onViewZone('graveyard')}
          onDrop={(e) => {
            e.preventDefault()
            const cardId = e.dataTransfer.getData('cardId')
            const fromZone = e.dataTransfer.getData('fromZone')
            handleMoveCard(cardId, fromZone, 'graveyard')
          }}
        />
        
        <ZoneSymbolCard 
          icon={<Flame className="w-8 h-8" />}
          glowColor="rgba(239,68,68,0.8)"
          label="Exile"
          count={player.zones.exile.length}
          size="small"
          onClick={() => onViewZone('exile')}
          onDrop={(e) => {
            e.preventDefault()
            const cardId = e.dataTransfer.getData('cardId')
            const fromZone = e.dataTransfer.getData('fromZone')
            handleMoveCard(cardId, fromZone, 'exile')
          }}
        />
        
        <ZoneSymbolCard 
          icon={<Crown className="w-8 h-8" />}
          glowColor="rgba(251,191,36,0.8)"
          label="Command"
          count={player.zones.command.length}
          size="small"
          onClick={() => onViewZone('command')}
          onDrop={(e) => {
            e.preventDefault()
            const cardId = e.dataTransfer.getData('cardId')
            const fromZone = e.dataTransfer.getData('fromZone')
            handleMoveCard(cardId, fromZone, 'command')
          }}
        />
      </div>

      {/* Your Board Button */}
      <button
        onClick={onSelectBattlefield}
        onDragOver={(e) => {
          if (isViewingHand) return
          e.preventDefault()
          e.currentTarget.classList.add('ring-4', 'ring-yellow-400')
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('ring-4', 'ring-yellow-400')
        }}
        onDrop={async (e) => {
          if (isViewingHand) return
          e.preventDefault()
          e.currentTarget.classList.remove('ring-4', 'ring-yellow-400')
          
          const cardId = e.dataTransfer.getData('cardId')
          const fromZone = e.dataTransfer.getData('fromZone')
          
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId: player.id,
            data: {
              cardId,
              fromZone,
              toZone: 'battlefield',
              position: { x: 100, y: 50 },
              isFaceUp: true
            }
          })
        }}
        className="flex-1 bg-slate-900 hover:bg-slate-800 rounded-lg p-4 border-2 border-slate-700 shadow-xl relative overflow-hidden transition-all group"
      >
        <div className="relative z-10">
          <Swords className="w-12 h-12 mx-auto mb-2 text-white group-hover:drop-shadow-[0_0_12px_rgba(234,179,8,0.8)] transition-all" />
          <div className="text-white font-bold text-lg mb-1">Your Board</div>
          <div className="text-white text-3xl font-bold">
            {player.zones.battlefield.length}
          </div>
        </div>
      </button>
    </div>
  )
}

function ZoneSymbolCard({ icon, glowColor, label, count, size = 'normal', onClick, onDrop }: {
  icon: React.ReactNode
  glowColor: string
  label: string
  count: number
  size?: 'normal' | 'small'
  onClick: () => void
  onDrop?: (e: React.DragEvent) => void
}) {
  const sizeClasses = size === 'small' ? 'p-2' : 'p-4'
  const countSize = size === 'small' ? 'text-xl' : 'text-3xl'
  
  return (
    <button
      onClick={onClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`bg-slate-900 hover:bg-slate-800 ${sizeClasses} rounded-lg border-2 border-slate-700 hover:scale-105 transition-all shadow-md flex items-center justify-between group relative flex-1`}
      style={{
        ['--glow-color' as string]: glowColor
      }}
    >
      <div className="flex items-center gap-2">
        <div className="text-white group-hover:[filter:drop-shadow(0_0_8px_var(--glow-color))] transition-all">
          {icon}
        </div>
        <div className={`${countSize} font-bold text-white`}>
          {count}
        </div>
      </div>
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
        {label}
      </div>
    </button>
  )
}