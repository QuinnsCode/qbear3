'use client'

import React from 'react'
import type { GameState, Territory } from '@/app/lib/GameState'

interface SetupPhaseUIProps {
  gameState: GameState
  gameId: string
  currentUserId: string
  onTerritoryClick: (territoryId: string) => void
  onPlaceCommander: (territoryId: string, commanderType: 'land' | 'diplomat') => void
  onPlaceSpaceBase: (territoryId: string) => void
}

function SetupPhaseUI({ 
  gameState, 
  gameId, 
  currentUserId, 
  onTerritoryClick,
  onPlaceCommander,
  onPlaceSpaceBase 
}: SetupPhaseUIProps) {
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === currentUserId
  const myPlayer = gameState.players.find(p => p.id === currentUserId)
  
  // Get phase-specific information
  const getPhaseInfo = () => {
    switch (gameState.setupPhase) {
      case 'units':
        return {
          title: '🎯 Place Units',
          description: 'Place 3 units per turn on your territories',
          instruction: isMyTurn 
            ? `Place ${Math.min(3 - (currentPlayer.unitsPlacedThisTurn || 0), currentPlayer.remainingUnitsToPlace || 0)} more units`
            : `${currentPlayer.name} is placing units`,
          canInteract: isMyTurn,
          actionType: 'place_unit' as const
        }
      case 'land_commander':
        return {
          title: '⚔️ Place Land Commander',
          description: 'Place one land commander on your territory',
          instruction: isMyTurn 
            ? 'Choose a territory for your Land Commander'
            : `${currentPlayer.name} is placing their Land Commander`,
          canInteract: isMyTurn,
          actionType: 'place_commander' as const,
          commanderType: 'land' as const
        }
      case 'diplomat_commander':
        return {
          title: '🤝 Place Diplomat Commander', 
          description: 'Place one diplomat commander on your territory',
          instruction: isMyTurn 
            ? 'Choose a territory for your Diplomat Commander'
            : `${currentPlayer.name} is placing their Diplomat Commander`,
          canInteract: isMyTurn,
          actionType: 'place_commander' as const,
          commanderType: 'diplomat' as const
        }
      case 'space_base':
        return {
          title: '🚀 Place Space Base',
          description: 'Place one space base on your territory',
          instruction: isMyTurn 
            ? 'Choose a territory for your Space Base'
            : `${currentPlayer.name} is placing their Space Base`,
          canInteract: isMyTurn,
          actionType: 'place_space_base' as const
        }
      default:
        return {
          title: '✅ Setup Complete',
          description: 'All setup phases completed',
          instruction: 'Ready to start the main game!',
          canInteract: false,
          actionType: 'none' as const
        }
    }
  }

  const phaseInfo = getPhaseInfo()

  // Handle territory clicks based on current phase
  const handleTerritoryClick = (territoryId: string) => {
    if (!phaseInfo.canInteract) return
    
    const territory = gameState.territories[territoryId]
    if (!territory || territory.ownerId !== currentUserId) return
    
    switch (phaseInfo.actionType) {
      case 'place_unit':
        // Check if player can still place units this turn
        const unitsThisTurn = currentPlayer.unitsPlacedThisTurn || 0
        const remainingUnits = currentPlayer.remainingUnitsToPlace || 0
        if (unitsThisTurn >= 3 || remainingUnits <= 0) return
        
        onTerritoryClick(territoryId)
        break
        
      case 'place_commander':
        if (phaseInfo.commanderType) {
          // Check if player already has this commander type
          const hasCommander = myPlayer?.territories.some(tId => {
            const t = gameState.territories[tId]
            return phaseInfo.commanderType === 'land' 
              ? t?.landCommander === currentUserId
              : t?.diplomatCommander === currentUserId
          })
          
          if (!hasCommander) {
            onPlaceCommander(territoryId, phaseInfo.commanderType)
          }
        }
        break
        
      case 'place_space_base':
        // Check if player already has a space base
        const hasSpaceBase = myPlayer?.territories.some(tId => 
          gameState.territories[tId]?.spaceBase === currentUserId
        )
        
        if (!hasSpaceBase) {
          onPlaceSpaceBase(territoryId)
        }
        break
    }
  }

  // Get my territories for interaction
  const myTerritories = myPlayer?.territories || []
  
  // Check completion status for current player
  const getCompletionStatus = () => {
    if (!myPlayer) return { completed: false, reason: 'Player not found' }
    
    switch (gameState.setupPhase) {
      case 'units':
        const remaining = myPlayer.remainingUnitsToPlace || 0
        return { 
          completed: remaining <= 0, 
          reason: remaining > 0 ? `${remaining} units remaining` : 'All units placed' 
        }
      case 'land_commander':
        const hasLandCommander = myPlayer.territories.some(tId => 
          gameState.territories[tId]?.landCommander === myPlayer.id
        )
        return { 
          completed: hasLandCommander, 
          reason: hasLandCommander ? 'Land Commander placed' : 'Need to place Land Commander' 
        }
      case 'diplomat_commander':
        const hasDiplomatCommander = myPlayer.territories.some(tId => 
          gameState.territories[tId]?.diplomatCommander === myPlayer.id
        )
        return { 
          completed: hasDiplomatCommander, 
          reason: hasDiplomatCommander ? 'Diplomat Commander placed' : 'Need to place Diplomat Commander' 
        }
      case 'space_base':
        const hasSpaceBase = myPlayer.territories.some(tId => 
          gameState.territories[tId]?.spaceBase === myPlayer.id
        )
        return { 
          completed: hasSpaceBase, 
          reason: hasSpaceBase ? 'Space Base placed' : 'Need to place Space Base' 
        }
      default:
        return { completed: true, reason: 'Setup complete' }
    }
  }

  const myStatus = getCompletionStatus()

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Phase Header */}
      <div className={`border rounded-lg p-4 ${
        isMyTurn ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-300'
      }`}>
        <h1 className="text-xl font-bold">{phaseInfo.title}</h1>
        <p className="text-sm text-gray-600 mt-1">{phaseInfo.description}</p>
        <p className={`mt-2 font-medium ${isMyTurn ? 'text-green-700' : 'text-blue-700'}`}>
          {phaseInfo.instruction}
        </p>
      </div>

      {/* Current Turn Indicator */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-bold mb-2">🎯 Current Turn</h2>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">{currentPlayer.name}</span>
            {isMyTurn && <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Your Turn</span>}
          </div>
          <div className={`w-4 h-4 rounded-full bg-${currentPlayer.color}-500`}></div>
        </div>
      </div>

      {/* My Status */}
      {myPlayer && (
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-bold mb-2">📊 Your Progress</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">{myStatus.reason}</p>
              {gameState.setupPhase === 'units' && (
                <div className="text-xs text-gray-500 mt-1">
                  Units placed this turn: {currentPlayer.unitsPlacedThisTurn || 0}/3
                </div>
              )}
            </div>
            <div className={`px-3 py-1 rounded text-sm ${
              myStatus.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {myStatus.completed ? '✅ Complete' : '⏳ In Progress'}
            </div>
          </div>
        </div>
      )}

      {/* Territory Instructions */}
      {phaseInfo.canInteract && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <h2 className="font-bold mb-2">🎮 Instructions</h2>
          <div className="text-sm">
            {phaseInfo.actionType === 'place_unit' && (
              <p>Click on your blue territories to place units. You can place up to 3 units per turn.</p>
            )}
            {phaseInfo.actionType === 'place_commander' && (
              <p>Click on one of your territories to place your {phaseInfo.commanderType} commander.</p>
            )}
            {phaseInfo.actionType === 'place_space_base' && (
              <p>Click on one of your territories to place your space base.</p>
            )}
          </div>
        </div>
      )}

      {/* Player Summary */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-bold mb-3">👥 All Players</h2>
        <div className="space-y-2">
          {gameState.players.filter(p => !p.name.includes('NPC')).map(player => (
            <div key={player.id} className={`flex items-center justify-between p-2 rounded ${
              player.id === currentPlayer.id ? 'bg-blue-50' : 'bg-gray-50'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full bg-${player.color}-500`}></div>
                <span className="font-medium">{player.name}</span>
                {player.id === currentUserId && <span className="text-xs text-blue-600">(You)</span>}
              </div>
              <div className="text-sm text-gray-600">
                {gameState.setupPhase === 'units' && `${player.remainingUnitsToPlace || 0} units left`}
                {gameState.setupPhase !== 'units' && `${player.territories.length} territories`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Territory Click Instructions */}
      {phaseInfo.canInteract && myTerritories.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-bold mb-2">🗺️ Your Territories</h2>
          <p className="text-sm text-gray-600 mb-3">
            Click on any of these territories to {
              phaseInfo.actionType === 'place_unit' ? 'place a unit' :
              phaseInfo.actionType === 'place_commander' ? `place your ${phaseInfo.commanderType} commander` :
              phaseInfo.actionType === 'place_space_base' ? 'place your space base' : 'interact'
            }:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {myTerritories.map(territoryId => {
              const territory = gameState.territories[territoryId]
              if (!territory) return null
              
              return (
                <button
                  key={territoryId}
                  onClick={() => handleTerritoryClick(territoryId)}
                  className="p-2 text-left border rounded hover:bg-blue-50 transition-colors"
                  disabled={!phaseInfo.canInteract}
                >
                  <div className="font-medium text-sm">{territory.name}</div>
                  <div className="text-xs text-gray-500">
                    Units: {territory.machineCount}
                    {territory.landCommander && <span className="ml-1">⚔️</span>}
                    {territory.diplomatCommander && <span className="ml-1">🤝</span>}
                    {territory.spaceBase && <span className="ml-1">🚀</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SetupPhaseUI