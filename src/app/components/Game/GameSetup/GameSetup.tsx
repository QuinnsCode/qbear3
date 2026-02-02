'use client'

import React from 'react'
import { setupNewGame, getSetupInfo, getPlayerStats, GAME_CONFIG } from '@/app/services/game/gameSetup'
import { restartGameWithNuking } from '@/app/serverActions/gameActions';
import { Gamepad2 } from 'lucide-react';


import type { GameState } from '@/app/lib/GameState'

interface GameSetupProps {
  gameState: GameState
  gameId: string
  currentUserId: string
  onGameStateUpdate: (newGameState: GameState) => void
}

function GameSetup({ gameState, gameId, currentUserId, onGameStateUpdate }: GameSetupProps) {
  const [nukeCount, setNukeCount] = React.useState(4)
  const setupInfo = getSetupInfo(gameState)
  const playerStats = getPlayerStats(gameState)
  
  //cahnged to run on server
  // const handleRestartGame = () => {
  //   console.log(`🔄 Restarting game with ${nukeCount} nuked territories...`)
  //   const newGameState = setupNewGame(gameId, currentUserId, 'player-2', nukeCount)
  //   console.log('✅ New game state created:', newGameState)
  //   onGameStateUpdate(newGameState)
  // }

  const handleRestartGame = async () => {
    try {
      console.log(`🔄 Restarting game with ${nukeCount} nuked territories...`);
      const newGameState = await restartGameWithNuking(gameId, currentUserId, 'player-2', nukeCount);
      console.log('✅ Game restarted:', newGameState);
      onGameStateUpdate(newGameState);
    } catch (error) {
      console.error('Error restarting game:', error);
    }
  };
  
  const handleStartGame = () => {
    if (!setupInfo.canProceed) return
    
    const updatedGameState = {
      ...gameState,
      status: 'playing' as const,
      currentPhase: 1 as const // Start with bidding phase
    }
    
    onGameStateUpdate(updatedGameState)
  }

  // Get nuked territories from game actions
  const gameStartAction = gameState.actions?.find(action => action.type === 'game_initialized')
  const nukedTerritories = gameStartAction?.data?.nukedTerritories || []
  const totalLandTerritories = 42
  const activeTerritories = Object.keys(gameState.territories).length

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-blue-100 border border-blue-300 rounded p-4">
        <h1 className="text-2xl font-bold text-blue-800 flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-white" />
          Game Setup
        </h1>
        <p className="text-blue-700 mt-1">Setting up 1v1 + NPC game</p>
      </div>
      
      {/* Game Configuration */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-bold mb-3">⚙️ Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600">Nuke Count</p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="10"
                value={nukeCount}
                onChange={(e) => setNukeCount(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 border rounded text-center"
              />
              <span className="text-xs text-gray-500">territories</span>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600">NPC Units per Territory</p>
            <p className="font-semibold">{GAME_CONFIG.NPC_UNITS_PER_TERRITORY}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600">Player Starting Units</p>
            <p className="font-semibold">{GAME_CONFIG.PLAYER_STARTING_UNITS_PER_TERRITORY}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600">Active Territories</p>
            <p className="font-semibold">{activeTerritories} / {totalLandTerritories}</p>
          </div>
        </div>
      </div>

      {/* Nuked Territories Display */}
      {nukedTerritories.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-bold mb-3 text-red-800">💥 Nuked Territories</h2>
          <p className="text-sm text-red-700 mb-3">
            {nukedTerritories.length} territories were randomly destroyed and removed from play:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {nukedTerritories.map((territory: any) => (
              <div key={territory.id} className="bg-red-100 border border-red-300 rounded p-2 text-sm">
                <span className="font-semibold text-red-800">{territory.id}:</span>
                <span className="text-red-700 ml-1">{territory.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-red-600 mt-2">
            * These territories cannot be controlled and block movement between connected areas
          </p>
        </div>
      )}

      {/* Player Stats */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-bold mb-3">👥 Player Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {playerStats.map(player => (
            <div 
              key={player.playerId} 
              className={`border rounded p-3 ${
                player.playerId === currentUserId ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{player.name}</span>
                <span className={`px-2 py-1 text-xs rounded text-white bg-${player.color}-600`}>
                  {player.color}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div>Territories: <span className="font-semibold">{player.territoryCount}</span></div>
                <div>Total Units: <span className="font-semibold">{player.totalUnits}</span></div>
                <div>Type: <span className="font-semibold">
                  {player.playerId === 'npc-neutral' ? 'NPC' : 
                   player.playerId === currentUserId ? 'You' : 'Human'}
                </span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Territory Distribution Preview */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-bold mb-3">🗺️ Territory Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gameState.players.map(player => (
            <div key={player.id} className="border rounded p-3">
              <h3 className={`font-semibold mb-2 text-${player.color}-700`}>
                {player.name} ({player.territories.length} territories)
              </h3>
              <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                {player.territories.map(territoryId => {
                  const territory = gameState.territories[territoryId]
                  return (
                    <div key={territoryId} className="flex justify-between">
                      <span className="truncate">{territory?.name || territoryId}</span>
                      <span className="ml-2 font-semibold">{territory?.machineCount || 0}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Status */}
      <div className={`border rounded-lg p-4 ${
        setupInfo.isSetupPhase ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'
      }`}>
        <h2 className="text-lg font-bold mb-2">📋 Setup Status</h2>
        <p className="mb-3">{setupInfo.setupInstructions}</p>
        
        {setupInfo.currentPlayer && (
          <div className="mb-3 p-2 bg-white rounded border">
            <p className="text-sm">
              <strong>Current Player:</strong> {setupInfo.currentPlayer.name}
              {setupInfo.currentPlayer.id === currentUserId && <span className="text-blue-600"> (Your Turn)</span>}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-white" />
          Game Controls
        </h2>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleRestartGame}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            🔄 Restart Game (Nuke {nukeCount} Random Territories)
          </button>
          
          {setupInfo.canProceed && (
            <button 
              onClick={handleStartGame}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              ▶️ Start Game (Go to Phase 1: Bidding)
            </button>
          )}
          
          {gameState.status === 'setup' && !setupInfo.canProceed && (
            <button 
              disabled
              className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
            >
              ⏳ Complete Setup First
            </button>
          )}
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          <p><strong>Next:</strong> After starting, players will take turns in the 7-phase system:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Bidding for turn order</li>
            <li>Collect & Deploy income</li>
            <li>Hire commanders & build</li>
            <li>Buy command cards</li>
            <li>Play command cards</li>
            <li>Attack territories</li>
            <li>Fortify positions</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default GameSetup