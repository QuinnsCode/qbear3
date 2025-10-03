'use client'

import React, { useState } from 'react'
import type { GameState, Territory } from '@/app/lib/GameState'
import { areTerritoriesConnected, canAttackTerritory, getPhaseInfo } from '@/app/services/game/gameFunctions'
import { TERRITORY_POSITIONS } from '@/app/components/Game/GameData/gameData'

interface InteractiveMapProps {
  gameState: GameState
  currentUserId: string
  selectedTerritory?: string | null
  onTerritoryAction: (territoryId: string, action: 'attack' | 'fortify' | 'place' | 'info') => void
}

interface TerritoryNodeProps {
  territory: Territory
  gameState: GameState
  currentUserId: string
  isSelected: boolean
  canInteract: boolean
  interactionMode: 'none' | 'attack' | 'fortify' | 'place'
  onTerritoryClick: (territoryId: string) => void
}

function TerritoryNode({ 
  territory, 
  gameState, 
  currentUserId, 
  isSelected, 
  canInteract,
  interactionMode,
  onTerritoryClick 
}: TerritoryNodeProps) {
  const position = TERRITORY_POSITIONS[territory.id] || { x: 400, y: 200 }
  const isOwned = territory.ownerId === currentUserId
  const owner = gameState.players.find(p => p.id === territory.ownerId)
  
  // Determine node color based on ownership
  const getNodeColor = () => {
    if (!owner) return 'rgb(156, 163, 175)' // gray-400
    
    const colorMap: Record<string, string> = {
      'purple': 'rgb(147, 51, 234)', // purple-600 (darker, more vibrant)
      'green': 'rgb(22, 163, 74)',   // green-600
      'blue': 'rgb(37, 99, 235)',    // blue-600
      'red': 'rgb(220, 38, 38)',     // red-600
      'yellow': 'rgb(202, 138, 4)',  // yellow-600
      'gray': 'rgb(75, 85, 99)',     // gray-600
    }
    
    return colorMap[owner.color] || 'rgb(156, 163, 175)'
  }
  
  // Determine if this territory can be targeted based on interaction mode
  const canBeTargeted = () => {
    if (interactionMode === 'attack') {
      return !isOwned && territory.ownerId !== currentUserId
    }
    if (interactionMode === 'fortify' || interactionMode === 'place') {
      return isOwned
    }
    return canInteract
  }
  
  const nodeColor = getNodeColor()
  const canTarget = canBeTargeted()
  
  return (
    <g>
      {/* Glow effect for selected territory */}
      {/* Glow effect for selected territory */}
      {isSelected && (
        <circle
          cx={position.x}
          cy={position.y}
          r={32}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={3}
          opacity={0.6}
          className="animate-pulse"
        />
      )}

      {/* Outer ring for better definition */}
      <circle
        cx={position.x}
        cy={position.y}
        r={isSelected ? 27 : 22}
        fill="none"
        stroke="#1f2937"
        strokeWidth={2}
        opacity={0.8}
      />
      
      {/* Territory circle */}
      <circle
        cx={position.x}
        cy={position.y}
        r={isSelected ? 25 : 20}
        fill={nodeColor}
        stroke={isSelected ? '#fbbf24' : canTarget ? '#ffffff' : '#374151'}
        strokeWidth={isSelected ? 3 : canTarget ? 2.5 : 1.5}
        opacity={canTarget ? 1 : 0.7}
        className={canTarget ? 'cursor-pointer hover:opacity-90 transition-opacity' : 'cursor-default'}
        onClick={() => canTarget && onTerritoryClick(territory.id)}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      />
      
      {/* Unit count */}
      <text
        x={position.x}
        y={position.y + 5}
        textAnchor="middle"
        className="pointer-events-none select-none"
        style={{ 
          fontSize: '13px',
          fontWeight: 'bold',
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidth: '0.5px',
          paintOrder: 'stroke'
        }}
      >
        {territory.machineCount}
      </text>
      
      {/* Territory name (on hover) */}
      <title>{territory.name} ({territory.machineCount} units)</title>
    </g>
  )
}

function ConnectionLine({ from, to }: { from: { x: number; y: number }, to: { x: number; y: number } }) {
  return (
    <g>
      {/* Thicker background line for better visibility */}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="rgba(75, 85, 99, 0.5)"
        strokeWidth="3"
        className="pointer-events-none"
      />
      {/* Lighter overlay line */}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="rgba(209, 213, 219, 0.4)"
        strokeWidth="1.5"
        className="pointer-events-none"
      />
    </g>
  )
}

function InteractiveMap({ gameState, currentUserId, selectedTerritory, onTerritoryAction }: InteractiveMapProps) {
  const [hoveredTerritory, setHoveredTerritory] = useState<string | null>(null)
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === currentUserId
  const phaseInfo = getPhaseInfo(gameState.currentPhase)
  
  // Determine interaction mode based on game phase
  const getInteractionMode = (): 'none' | 'attack' | 'fortify' | 'place' => {
    if (!isMyTurn) return 'none'
    
    switch (gameState.currentPhase) {
      case 2: return 'place'   // Collect & Deploy
      case 5: return 'attack'  // Invade Territories
      case 6: return 'fortify' // Fortify Position
      default: return 'none'
    }
  }
  
  const interactionMode = getInteractionMode()
  
  const handleTerritoryClick = (territoryId: string) => {
    const territory = gameState.territories[territoryId]
    if (!territory) return
    
    // Just pass the action to the parent - let GameBoard handle the logic
    if (interactionMode === 'attack') {
      onTerritoryAction(territoryId, 'attack')
    } else if (interactionMode === 'fortify') {
      onTerritoryAction(territoryId, 'fortify')
    } else if (interactionMode === 'place') {
      onTerritoryAction(territoryId, 'place')
    } else {
      // Info mode - just show territory info
      onTerritoryAction(territoryId, 'info')
    }
  }
  
  // Generate connections for visualization
  const connections = []
  Object.values(gameState.territories).forEach(territory => {
    territory.connections.forEach(connectionId => {
      const fromPos = TERRITORY_POSITIONS[territory.id]
      const toPos = TERRITORY_POSITIONS[connectionId]
      if (fromPos && toPos && parseInt(territory.id) < parseInt(connectionId)) {
        // Only draw each connection once
        connections.push({ from: fromPos, to: toPos })
      }
    })
  })
  
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">🗺️ Territory Map</h2>
        <div className="text-sm">
          <span className={`px-2 py-1 rounded ${isMyTurn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {isMyTurn ? 'Your Turn' : `${currentPlayer?.name || 'Unknown'}'s Turn`}
          </span>
          <span className="ml-2 px-2 py-1 rounded bg-blue-100 text-purple-800">
            Phase {gameState.currentPhase}: {phaseInfo.name}
          </span>
        </div>
      </div>
      
      {/* Interaction Instructions */}
      <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
        {interactionMode === 'attack' && isMyTurn && (
          <p><strong>Attack Mode:</strong> Click your territory, then click an enemy territory to attack</p>
        )}
        {interactionMode === 'fortify' && isMyTurn && (
          <p><strong>Fortify Mode:</strong> Click your territory, then click a connected territory to move units</p>
        )}
        {interactionMode === 'place' && isMyTurn && (
          <p><strong>Deploy Mode:</strong> Click your territories to place units</p>
        )}
        {interactionMode === 'none' && (
          <p><strong>Info Mode:</strong> Click territories to view details. {!isMyTurn ? "Wait for your turn." : "No actions available this phase."}</p>
        )}
        {selectedTerritory && (
          <p className="mt-1 text-purple-800">
            Selected: {gameState.territories[selectedTerritory]?.name}
          </p>
        )}
      </div>
      
      {/* SVG Map */}
      <div className="border rounded bg-gradient-to-br from-slate-800 to-slate-900 overflow-auto">
        <svg width="900" height="450" className="min-w-full">
          {/* Draw connections first (behind territories) */}
          {connections.map((connection, index) => (
            <ConnectionLine key={index} from={connection.from} to={connection.to} />
          ))}
          
          {/* Draw territories */}
          {Object.values(gameState.territories).map(territory => {
            if (!TERRITORY_POSITIONS[territory.id]) return null
            
            return (
              <TerritoryNode
                key={territory.id}
                territory={territory}
                gameState={gameState}
                currentUserId={currentUserId}
                isSelected={selectedTerritory === territory.id}
                canInteract={isMyTurn}
                interactionMode={interactionMode}
                onTerritoryClick={handleTerritoryClick}
              />
            )
          })}
        </svg>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {gameState.players.map(player => (
          <div key={player.id} className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-full bg-${player.color}-500`}></div>
            <span>{player.name}</span>
            {player.id === currentUserId && <span className="text-purple-700">(You)</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default InteractiveMap