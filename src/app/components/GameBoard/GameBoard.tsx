// GameBoard.tsx - Main game component with setup phase support
'use client'

import React, { useState, useEffect } from 'react'
import type { GameState } from '@/app/lib/GameState'
import { getSetupInfo, canPlaceUnitOnTerritory } from '@/app/services/game/gameSetup'
import InteractiveMap from '@/app/components/Game/GameMap/InteractiveMap'
import SetupPhase from '@/app/components/Game/GameSetup/SetupPhase'

interface GameBoardProps {
  gameState: GameState
  currentUserId: string
  onAction: (action: any) => Promise<void>
}

function GameBoard({ gameState, currentUserId, onAction }: GameBoardProps) {
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const setupInfo = getSetupInfo(gameState)
  const isSetupPhase = setupInfo.isSetupPhase
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === currentUserId

  // Handle territory actions
  const handleTerritoryAction = async (territoryId: string, action: 'attack' | 'fortify' | 'place' | 'info') => {
    if (isProcessing) return
    
    const territory = gameState.territories[territoryId]
    if (!territory) return

    try {
      setIsProcessing(true)

      if (isSetupPhase) {
        await handleSetupAction(territoryId)
      } else {
        await handleGameAction(territoryId, action)
      }
    } catch (error) {
      console.error('Territory action error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle setup phase actions (unit placement)
  const handleSetupAction = async (territoryId: string) => {
    if (!isMyTurn) {
      console.log('Not your turn during setup')
      return
    }

    const canPlace = canPlaceUnitOnTerritory(gameState, currentUserId, territoryId)
    if (!canPlace.canPlace) {
      console.log('Cannot place unit:', canPlace.reason)
      return
    }

    console.log(`Placing unit on territory ${territoryId}`)

    // Place 1 unit - SERVER ENFORCES ALL LIMITS
    await onAction({
      type: 'place_unit',
      playerId: currentUserId,
      data: {
        territoryId,
        count: 1
      }
    })

    // SERVER WILL HANDLE:
    // - Checking if player placed max units for this turn
    // - Auto-advancing setup turn when appropriate
    // - No need for client-side turn counting!
  }

  // Handle regular game actions
  const handleGameAction = async (territoryId: string, action: 'attack' | 'fortify' | 'place' | 'info') => {
    if (!isMyTurn && action !== 'info') {
      console.log('Not your turn')
      return
    }

    switch (action) {
      case 'attack':
        await handleAttackAction(territoryId)
        break
      case 'fortify':
        await handleFortifyAction(territoryId)
        break
      case 'place':
        await handlePlaceAction(territoryId)
        break
      case 'info':
        handleInfoAction(territoryId)
        break
    }
  }

  const handleAttackAction = async (territoryId: string) => {
    const territory = gameState.territories[territoryId]
    
    if (!selectedTerritory) {
      // Select attacking territory
      if (territory.ownerId === currentUserId && territory.machineCount > 1) {
        setSelectedTerritory(territoryId)
        console.log(`Selected attacking territory: ${territory.name}`)
      } else {
        console.log('Cannot attack from this territory')
      }
    } else {
      // Execute attack
      if (territory.ownerId !== currentUserId) {
        const fromTerritory = gameState.territories[selectedTerritory]
        const attackingUnits = Math.min(fromTerritory.machineCount - 1, 3)
        
        // await onAction({
        //   type: 'attack_territory',
        //   playerId: currentUserId,
        //   data: {
        //     fromTerritoryId: selectedTerritory,
        //     toTerritoryId: territoryId,
        //     attackingUnits
        //   }
        // })
        
        setSelectedTerritory(null)
      } else {
        console.log('Cannot attack your own territory')
        setSelectedTerritory(null)
      }
    }
  }

  const handleFortifyAction = async (territoryId: string) => {
    const territory = gameState.territories[territoryId]
    
    if (!selectedTerritory) {
      // Select source territory
      if (territory.ownerId === currentUserId && territory.machineCount > 1) {
        setSelectedTerritory(territoryId)
        console.log(`Selected source territory: ${territory.name}`)
      } else {
        console.log('Cannot fortify from this territory')
      }
    } else {
      // Execute fortify
      if (territory.ownerId === currentUserId && territoryId !== selectedTerritory) {
        const fromTerritory = gameState.territories[selectedTerritory]
        const unitsToMove = Math.min(fromTerritory.machineCount - 1, 2)
        
        await onAction({
          type: 'fortify_territory',
          playerId: currentUserId,
          data: {
            fromTerritoryId: selectedTerritory,
            toTerritoryId: territoryId,
            unitCount: unitsToMove
          }
        })
        
        setSelectedTerritory(null)
      } else {
        console.log('Invalid fortify target')
        setSelectedTerritory(null)
      }
    }
  }

  const handlePlaceAction = async (territoryId: string) => {
    const territory = gameState.territories[territoryId]
    
    if (territory.ownerId === currentUserId) {
      await onAction({
        type: 'deploy_machines',
        playerId: currentUserId,
        data: {
          territoryId,
          count: 1
        }
      })
    } else {
      console.log('Cannot place units on enemy territory')
    }
  }

  const handleInfoAction = (territoryId: string) => {
    const territory = gameState.territories[territoryId]
    const owner = gameState.players.find(p => p.id === territory.ownerId)
    
    console.log(`Territory Info: ${territory.name}`)
    console.log(`Owner: ${owner?.name || 'Neutral'}`)
    console.log(`Units: ${territory.machineCount}`)
    console.log(`Connections: ${territory.connections.length}`)
    
    // You could show this in a modal or info panel
  }

  const handleFinishSetup = async () => {
    await onAction({
      type: 'advance_phase',
      playerId: currentUserId,
      data: {}
    })
  }

  const handleAdvancePhase = async () => {
    if (!isMyTurn) return
    
    await onAction({
      type: 'advance_phase',
      playerId: currentUserId,
      data: {}
    })
  }

  // Auto-trigger AI turns
  useEffect(() => {
    if (isSetupPhase && currentPlayer && currentPlayer.name === 'AI Player' && !isProcessing) {
      // Trigger AI setup turn
      const timer = setTimeout(async () => {
        await onAction({
          type: 'process_ai_turn',
          playerId: currentPlayer.id,
          data: {}
        })
      }, 1500)
      
      return () => clearTimeout(timer)
    } else if (!isSetupPhase && currentPlayer && currentPlayer.name === 'AI Player' && !isProcessing) {
      // Trigger AI regular turn
      const timer = setTimeout(async () => {
        await onAction({
          type: 'process_ai_turn',
          playerId: currentPlayer.id,
          data: {}
        })
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [gameState.currentPlayerIndex, gameState.currentPhase, isSetupPhase, currentPlayer, isProcessing])

  useEffect(() => {
    // If it's AI's turn, poll the game state every few seconds
    if (currentPlayer && currentPlayer.name === 'AI Player' && !isProcessing) {
      const pollTimer = setInterval(async () => {
        try {
          // Call a function to fetch latest game state
          const freshState = await onAction({
            type: 'get_state',
            playerId: currentUserId,
            data: {}
          });
          // onGameStateUpdate will be called by onAction to update the UI
        } catch (error) {
          console.error('Error polling game state:', error);
        }
      }, 2000);
      
      return () => clearInterval(pollTimer);
    }
  }, [currentPlayer, isProcessing]);

  return (
    <div className="space-y-4">
      {/* Setup Phase UI */}
      {isSetupPhase && (
        <SetupPhase
          gameState={gameState}
          currentUserId={currentUserId}
          onPlaceUnit={(territoryId) => handleTerritoryAction(territoryId, 'place')}
          onFinishSetup={handleFinishSetup}
        />
      )}

      {/* Game Controls */}
      {!isSetupPhase && (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">🎮 Game Controls</h3>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-sm ${isMyTurn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {isMyTurn ? 'Your Turn' : `${currentPlayer?.name || 'Unknown'}'s Turn`}
              </span>
              <span className="px-2 py-1 rounded text-sm bg-purple-100 text-purple-800">
                Year {gameState.currentYear} - Phase {gameState.currentPhase}
              </span>
            </div>
          </div>
          
          {isMyTurn && (
            <div className="flex space-x-2">
              <button
                onClick={handleAdvancePhase}
                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                disabled={isProcessing}
              >
                End Phase
              </button>
              
              {selectedTerritory && (
                <button
                  onClick={() => setSelectedTerritory(null)}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                >
                  Cancel Selection
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Interactive Map */}
      <InteractiveMap
        gameState={gameState}
        currentUserId={currentUserId}
        selectedTerritory={selectedTerritory}
        onTerritoryAction={handleTerritoryAction}
      />

      {/* Game Status */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="font-bold mb-2">📊 Game Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gameState.players
            .filter(p => p.id !== 'npc-neutral')
            .map(player => {
              const territoryCount = player.territories.length
              const totalUnits = player.territories.reduce((sum, territoryId) => {
                const territory = gameState.territories[territoryId]
                return sum + (territory?.machineCount || 0)
              }, 0)
              
              return (
                <div key={player.id} className="bg-white rounded p-3 border">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-4 h-4 rounded-full bg-${player.color}-500`}></div>
                    <span className="font-medium">{player.name}</span>
                    {player.id === currentUserId && <span className="text-purple-700">(You)</span>}
                    {player.isActive && <span className="text-green-600">●</span>}
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Territories: {territoryCount}</div>
                    <div>Total Units: {totalUnits}</div>
                    {isSetupPhase && (
                      <div>Remaining to Place: {player.remainingUnitsToPlace || 0}</div>
                    )}
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-700"></div>
            <span>Processing...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameBoard