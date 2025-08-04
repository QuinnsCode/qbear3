'use client'

import React from 'react'
import { 
  calculateTerritoryBonus, 
  calculateContinentBonus, 
  calculatePlayerIncome,
  getPhaseInfo,
  getCurrentPlayer,
  CONTINENTS 
} from '@/app/services/game/gameFunctions'

interface GameStateDebugProps {
  gameState: any
  gameId: string
  currentUserId: string
}

function GameStateDebug({ gameState, gameId, currentUserId }: GameStateDebugProps) {
  // Safety check
  if (!gameState) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-100 border border-red-300 rounded p-4">
          <h2 className="text-xl font-bold text-red-800">⚠️ No Game State</h2>
          <p className="text-red-700">Game state is null or undefined</p>
          <div className="mt-2 text-sm">
            <p>Game ID: {gameId}</p>
            <p>User ID: {currentUserId}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="bg-blue-100 border border-blue-300 rounded p-4">
        <h1 className="text-2xl font-bold text-blue-800">🎮 Game State Debug</h1>
        <div className="mt-2 text-sm text-blue-700">
          <p>Game ID: <code className="bg-white px-1 rounded">{gameId}</code></p>
          <p>Current User: <code className="bg-white px-1 rounded">{currentUserId}</code></p>
        </div>
      </div>

      {/* Basic Game Info */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-bold mb-3">📊 Basic Game Info</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-semibold">{gameState.status || 'Unknown'}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Year</p>
            <p className="font-semibold">{gameState.currentYear || 'N/A'} / 5</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Phase</p>
            <p className="font-semibold">
              {gameState.currentPhase || 'N/A'} / 7
              {gameState.currentPhase && (
                <span className="block text-xs text-gray-500 mt-1">
                  {getPhaseInfo(gameState.currentPhase).name}
                </span>
              )}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Current Player</p>
            <p className="font-semibold">
              {getCurrentPlayer(gameState)?.name || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-bold mb-3">👥 Players ({gameState.players?.length || 0})</h2>
        {gameState.players && gameState.players.length > 0 ? (
          <div className="space-y-3">
            {gameState.players.map((player: any, index: number) => (
              <div 
                key={player.id || index} 
                className={`border rounded p-3 ${
                  player.id === currentUserId ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                } ${
                  index === gameState.currentPlayerIndex ? 'ring-2 ring-green-400' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{player.name || `Player ${index + 1}`}</span>
                    {player.color && (
                      <span className={`px-2 py-1 text-xs rounded text-white bg-${player.color}-600`}>
                        {player.color}
                      </span>
                    )}
                    {player.id === currentUserId && (
                      <span className="px-2 py-1 text-xs rounded bg-blue-600 text-white">YOU</span>
                    )}
                    {index === gameState.currentPlayerIndex && (
                      <span className="px-2 py-1 text-xs rounded bg-green-600 text-white">CURRENT</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    ID: <code className="text-xs">{player.id}</code>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Cards:</span> {player.cards?.length || 0}
                  </div>
                  <div>
                    <span className="text-gray-600">Territories:</span> {player.territories?.length || 0}
                  </div>
                  <div>
                    <span className="text-gray-600">Active:</span> {player.isActive ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <span className="text-gray-600">Pending Decision:</span> {player.pendingDecision ? 'Yes' : 'No'}
                  </div>
                </div>

                {/* Income Calculation */}
                {player.territories && player.territories.length > 0 && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                    <h4 className="text-sm font-semibold text-green-800 mb-1">Income Calculation</h4>
                    <div className="text-xs space-y-1">
                      <div>
                        Territory Bonus: {calculateTerritoryBonus(player.territories.length)} 
                        <span className="text-gray-600"> ({player.territories.length} ÷ 3)</span>
                      </div>
                      <div>
                        Continent Bonus: {calculateContinentBonus(player, gameState)}
                      </div>
                      <div className="font-semibold">
                        Standard Income: {calculatePlayerIncome(player, gameState, 0).energy} energy
                      </div>
                      <div className="text-green-700">
                        Conquest Bonus (3+ territories): {calculatePlayerIncome(player, gameState, 3).energy} energy + 1 land commander
                      </div>
                    </div>
                  </div>
                )}

                {/* Show territories if any */}
                {player.territories && player.territories.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-600">Territory IDs: </span>
                    <code className="bg-gray-100 px-1 rounded">{player.territories.join(', ')}</code>
                  </div>
                )}

                {/* Show pending decision details */}
                {player.pendingDecision && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <strong>Pending Decision:</strong>
                    <pre className="mt-1 text-xs overflow-x-auto">
                      {JSON.stringify(player.pendingDecision, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No players found</p>
        )}
      </div>

      {/* Continent Control Analysis */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-bold mb-3">🌍 Continent Control</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(CONTINENTS).map(([continentName, continent]) => {
            // Check who controls each territory in this continent
            const territoryControl = continent.territories.map(territoryId => {
              const territory = gameState.territories?.[territoryId.toString()]
              const owner = territory?.ownerId ? gameState.players?.find((p: any) => p.id === territory.ownerId) : null
              return {
                territoryId,
                territory,
                owner
              }
            })
            
            // Check if any player controls the entire continent
            const continentController = gameState.players?.find((player: any) => 
              continent.territories.every(territoryId => 
                player.territories?.includes(territoryId.toString())
              )
            )

            return (
              <div key={continentName} className={`border rounded p-3 ${
                continentController ? 'border-green-400 bg-green-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{continentName}</h3>
                  <span className="text-sm text-gray-600">+{continent.bonus} energy</span>
                </div>
                
                {continentController && (
                  <div className="mb-2 p-1 bg-green-100 rounded text-xs text-green-800">
                    <strong>Controlled by: {continentController.name}</strong>
                  </div>
                )}
                
                <div className="space-y-1">
                  {territoryControl.map(({ territoryId, territory, owner }) => (
                    <div key={territoryId} className="flex items-center justify-between text-xs">
                      <span className="truncate">{territory?.name || `Territory ${territoryId}`}</span>
                      <span className={`px-1 rounded text-white ${
                        owner ? `bg-${owner.color}-600` : 'bg-gray-400'
                      }`}>
                        {owner?.name || 'Unowned'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-bold mb-3">🗺️ Territories</h2>
        {gameState.territories ? (
          <div className="space-y-2">
            {Object.entries(gameState.territories).map(([territoryId, territory]: [string, any]) => (
              <div key={territoryId} className="border rounded p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{territory.name || territoryId}</span>
                  <div className="flex items-center space-x-2">
                    {territory.ownerId && (
                      <span className="px-2 py-1 text-xs rounded bg-gray-600 text-white">
                        Owner: {gameState.players?.find((p: any) => p.id === territory.ownerId)?.name || territory.ownerId}
                      </span>
                    )}
                    <span className="px-2 py-1 text-xs rounded bg-blue-600 text-white">
                      {territory.machineCount || 0} machines
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <div>Territory ID: <code className="text-xs">{territoryId}</code></div>
                  {territory.connections && territory.connections.length > 0 && (
                    <div>Connections: <code className="text-xs">{territory.connections.join(', ')}</code></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No territories found</p>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-bold mb-3">📜 Action History ({gameState.actions?.length || 0})</h2>
        {gameState.actions && gameState.actions.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {gameState.actions.map((action: any, index: number) => (
              <div 
                key={action.id || index} 
                className={`border rounded p-2 text-sm ${
                  index === gameState.currentActionIndex ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    #{index + 1}: {action.type || 'Unknown Action'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {action.timestamp ? new Date(action.timestamp).toLocaleTimeString() : 'No timestamp'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Player: {gameState.players?.find((p: any) => p.id === action.playerId)?.name || action.playerId || 'Unknown'}
                  {action.data && (
                    <div className="mt-1">
                      Data: <code className="bg-gray-100 px-1 rounded">{JSON.stringify(action.data)}</code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No actions recorded yet</p>
        )}
      </div>

      {/* Raw JSON */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-bold mb-3">🔍 Raw Game State JSON</h2>
        <details className="cursor-pointer">
          <summary className="text-sm text-blue-600 hover:text-blue-800">Click to expand raw JSON</summary>
          <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto border">
            {JSON.stringify(gameState, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}

export default GameStateDebug