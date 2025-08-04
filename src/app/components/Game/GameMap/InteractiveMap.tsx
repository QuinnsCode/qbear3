'use client'

import React, { useState } from 'react'
import type { GameState, Territory } from '@/app/lib/GameState'
import { areTerritoriesConnected, canAttackTerritory, getPhaseInfo } from '@/app/services/game/gameFunctions'
import { TERRITORY_POSITIONS } from '@/app/components/Game/GameData/gameData'

interface InteractiveMapProps {
  gameState: GameState
  currentUserId: string
  selectedTerritory?: string | null  // Add this prop
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
      'blue': 'rgb(59, 130, 246)',   // blue-500
      'red': 'rgb(239, 68, 68)',     // red-500
      'gray': 'rgb(107, 114, 128)',  // gray-500
      'green': 'rgb(34, 197, 94)',   // green-500
      'purple': 'rgb(168, 85, 247)', // purple-500
      'yellow': 'rgb(234, 179, 8)',  // yellow-500
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
      {/* Territory circle */}
      <circle
        cx={position.x}
        cy={position.y}
        r={isSelected ? 25 : 20}
        fill={nodeColor}
        stroke={isSelected ? '#000' : canTarget ? '#fff' : 'none'}
        strokeWidth={isSelected ? 3 : canTarget ? 2 : 0}
        opacity={canTarget ? 1 : 0.6}
        className={canTarget ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        onClick={() => canTarget && onTerritoryClick(territory.id)}
      />
      
      {/* Unit count */}
      <text
        x={position.x}
        y={position.y + 5}
        textAnchor="middle"
        className="text-white text-sm font-bold pointer-events-none select-none"
        style={{ fontSize: '12px' }}
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
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="rgba(156, 163, 175, 0.3)"
      strokeWidth="1"
      className="pointer-events-none"
    />
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
      case 6: return 'attack'  // Invade Territories
      case 7: return 'fortify' // Fortify Position
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
          <span className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-800">
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
          <p className="mt-1 text-blue-600">
            Selected: {gameState.territories[selectedTerritory]?.name}
          </p>
        )}
      </div>
      
      {/* SVG Map */}
      <div className="border rounded bg-blue-50 overflow-auto">
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
            {player.id === currentUserId && <span className="text-blue-600">(You)</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default InteractiveMap