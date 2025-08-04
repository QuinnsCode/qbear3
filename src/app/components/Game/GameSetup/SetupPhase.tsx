// SetupPhase.tsx - Component to handle setup phase
'use client'

import React from 'react'
import type { GameState, Player } from '@/app/lib/GameState'
import { getSetupInfo, canPlaceUnitOnTerritory } from '@/app/services/game/gameSetup'

interface SetupPhaseProps {
  gameState: GameState
  currentUserId: string
  onPlaceUnit: (territoryId: string) => void
  onFinishSetup: () => void
}

function SetupPhase({ gameState, currentUserId, onPlaceUnit, onFinishSetup }: SetupPhaseProps) {
  const setupInfo = getSetupInfo(gameState)
  const currentPlayer = setupInfo.currentPlayer
  const isMyTurn = currentPlayer?.id === currentUserId
  
  if (!setupInfo.isSetupPhase) {
    return null
  }

  if (setupInfo.canProceed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-green-800">🎉 Setup Complete!</h3>
            <p className="text-green-700">All players have finished placing their units.</p>
          </div>
          <button
            onClick={onFinishSetup}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Start Game
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-blue-800">🎲 Setup Phase</h3>
        {currentPlayer && (
          <div className="text-sm">
            <span className={`px-2 py-1 rounded ${isMyTurn ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
              {isMyTurn ? 'Your Turn' : `${currentPlayer.name}'s Turn`}
            </span>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <p className="text-blue-700">{setupInfo.setupInstructions}</p>
        
        {isMyTurn && setupInfo.remainingUnits > 0 && (
          <div className="bg-white rounded p-3 border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700">Units to place:</span>
              <span className="text-xl font-bold text-blue-600">{setupInfo.remainingUnits}</span>
            </div>
            <p className="text-sm text-gray-600">
              Click on your territories on the map to place units (1 unit per click)
            </p>
          </div>
        )}
        
        {/* Player setup progress */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Player Progress:</h4>
          {gameState.players
            .filter(p => p.id !== 'npc-neutral')
            .map(player => {
              const remaining = player.remainingUnitsToPlace || 0
              const isComplete = remaining <= 0
              const isCurrent = player.id === currentPlayer?.id
              
              return (
                <div key={player.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full bg-${player.color}-500`}></div>
                    <span className={`${isCurrent ? 'font-bold' : ''}`}>
                      {player.name}
                      {player.id === currentUserId && ' (You)'}
                      {isCurrent && ' ←'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isComplete ? (
                      <span className="text-green-600 font-medium">✓ Complete</span>
                    ) : (
                      <span className="text-orange-600 font-medium">{remaining} units left</span>
                    )}
                  </div>
                </div>
              )
            })
          }
        </div>
        
        {/* Territory ownership summary */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Territory Distribution:</h4>
          {gameState.players
            .filter(p => p.id !== 'npc-neutral')
            .map(player => {
              const territoryCount = player.territories.length
              const totalUnits = player.territories.reduce((sum, territoryId) => {
                const territory = gameState.territories[territoryId]
                return sum + (territory?.machineCount || 0)
              }, 0)
              
              return (
                <div key={player.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full bg-${player.color}-500`}></div>
                    <span>{player.name}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {territoryCount} territories, {totalUnits} units
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>
    </div>
  )
}

export default SetupPhase