// app/components/Game/MobileGameUI.tsx
// Enhanced MobileGameUI.tsx - FIXED AI INDICATOR POSITIONING
'use client'
import BuildHireOverlay from '@/app/components/Game/GamePhases/BuildHireOverlay';
import { 
  submitBid,
  startYearTurns,
  purchaseCommander, 
  placeCommanderInGame, 
  purchaseSpaceBaseGame, 
  placeSpaceBaseInGame,
  advanceFromBuildHire
} from '@/app/serverActions/gameActions';
import React, { useState } from 'react';
import { useGameSync } from '@/app/hooks/useGameSync';
import BiddingOverlay from '@/app/components/Game/GameBidding/BiddingOverlay';
import CollectDeployOverlay from '@/app/components/Game/GamePhases/CollectDeployOverlay';


import { 
  Settings, 
  Sword, 
  Shield, 
  Plus, 
  Info, 
  Menu, 
  X,
  // 🎨 Themed commander icons
  User,        // 👤 Diplomat Commander
  Mountain,    // ⛰️ Land Commander
  Zap,         // ⚡ Nuke Commander
  Ship,        // 🚢 Water Commander
  Castle,      // 🏰 Space Base
  Rocket,      // 🚀 Alternative space icon
  Crown        // 👑 Leadership
} from 'lucide-react';
import { 
  restartGameWithNuking, 
  placeUnit, 
  attackTerritory, 
  fortifyTerritory,
  placeCommander,
  placeSpaceBase,
  collectAndStartDeploy,
  confirmDeploymentComplete
} from '@/app/serverActions/gameActions';
import { GameActionButton } from '@/app/components/Game/GameUtils/GameActionButton';
import { GameStats } from '@/app/components/Game/GameUtils/GameStats';
import { GameMap } from '@/app/components/Game/GameMap/GameMap';

// Z-Index Hierarchy:
// z-60: Critical overlays (bidding, collect/deploy)
// z-50: Settings/Stats panels (always accessible)
// z-45: Panel overlay backgrounds  
// z-40: Status indicators (connection, AI thinking)
// z-30: Lower game elements
// z-20: UI bars (top bar, bottom action bar)
// z-10: Map and main content

// 🎨 THEMED ICON MAPPING
const COMMANDER_ICONS = {
  land: Mountain,        // ⛰️ Land Commander
  diplomat: User,        // 👤 Diplomat Commander  
  nuke: Zap,            // ⚡ Nuke Commander
  water: Ship,          // 🚢 Water Commander
};

const BASE_ICON = Castle;  // 🏰 Space Base

interface MobileGameUIProps {
  gameId: string
  currentUserId: string
  initialState: any
}

const MobileGameUI = ({ gameId, currentUserId, initialState }: MobileGameUIProps) => {
  
  const { gameState, isConnected, isLoading, error, utils } = useGameSync({
    gameId,
    playerId: currentUserId,
    enabled: true,
    onStateUpdate: (newState) => {
      console.log('🎮 FRONTEND RECEIVED WebSocket update:', {
        status: newState.status,
        setupPhase: newState.setupPhase,
        currentPlayer: newState.players[newState.currentPlayerIndex].name,
        timestamp: new Date().toISOString(),
        biddingYear: newState.bidding?.year,
        bidsSubmitted: newState.bidding ? Object.keys(newState.bidding.bidsSubmitted) : [],
        playersWaiting: newState.bidding?.playersWaitingToBid?.length || 0
      });
      
      setSelectedTerritory(null);
      setTerritoryActionInProgress(false);
      
      const currentPlayer = newState?.players[newState.currentPlayerIndex];
      if (currentPlayer?.id === currentUserId) {
        console.log('🎯 It\'s now your turn!');
      }
    },
    onError: (error) => {
      console.error('🎮 Game sync error:', error);
    },
    onGameRestarted: (newState, nukedTerritories) => {
      console.log('🔄 Game restarted:', newState, 'Nuked:', nukedTerritories);
    }
  });

  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [interactionMode, setInteractionMode] = useState('info');
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [territoryActionInProgress, setTerritoryActionInProgress] = useState(false);

  if (isLoading || !gameState) {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-bold mb-4">Loading Game...</h2>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-sm text-gray-400 mt-4">
            {isLoading ? 'Connecting to game server...' : 'Initializing...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-bold mb-4 text-red-400">Connection Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === currentUserId;
  const isAITurn = currentPlayer?.name === 'AI Player';
  const myPlayer = gameState?.players.find(p => p.id === currentUserId);

  const handleGameStateUpdate = async (newGameState: any, useServerAction: boolean = false) => {
    console.log('🔄 Game state update requested:', { useServerAction, newGameState })
    
    if (useServerAction) {
      setIsUpdating(true)
      try {
        const nukeCount = newGameState.actions?.[0]?.data?.nukedCount || 4
        console.log('🚀 Calling server action to restart game...')
        await restartGameWithNuking(gameId, currentUserId, 'player-2', nukeCount)
        console.log('✅ Server action completed - useGameSync will handle the update')
      } catch (error) {
        console.error('❌ Server action failed:', error)
        alert(`Failed to restart game: ${error.message}`)
      } finally {
        setIsUpdating(false)
      }
    }
  }

  const handleCollectAndStartDeploy = async (energyAmount: number, unitsToPlace: number) => {
    try {
      console.log(`⚡ Collecting ${energyAmount} energy and starting deployment of ${unitsToPlace} units`)
      await collectAndStartDeploy(gameId, currentUserId, energyAmount, unitsToPlace)
      console.log('✅ Collect and deploy started - useGameSync will handle the update')
    } catch (error) {
      console.error('❌ Collect and deploy failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to collect and start deploy: ${errorMessage}`)
      throw error
    }
  }


  const handleConfirmDeploymentComplete = async () => {
    try {
      console.log(`✅ Confirming deployment complete and advancing to Build & Hire`)
      await confirmDeploymentComplete(gameId, currentUserId)
      console.log('✅ Deployment confirmed - useGameSync will handle the update')
    } catch (error) {
      console.error('❌ Deployment confirmation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to confirm deployment: ${errorMessage}`)
      throw error
    }
  }


  // Enhanced territory action handler with setup phase support
  const handleTerritoryAction = async (territoryId: string, action: string) => {
    console.log(`🎯 Territory action: ${action} on territory ${territoryId}`)
    
    if (territoryActionInProgress) {
      console.log('⏳ Action already in progress, ignoring')
      return
    }
    
    const territory = gameState.territories[territoryId]
    if (!territory) {
      console.warn('Territory not found:', territoryId)
      return
    }
    
    try {
      setTerritoryActionInProgress(true)
      
      // Setup phase handling
      if (gameState.status === 'setup') {
        if (!isMyTurn) {
          alert("It's not your turn!")
          return
        }
        
        if (territory.ownerId !== currentUserId) {
          alert("You can only interact with your own territories during setup!")
          return
        }
        
        switch (gameState.setupPhase) {
          case 'units':
            if (action === 'place') {
              const unitsThisTurn = currentPlayer.unitsPlacedThisTurn || 0
              const remainingUnits = currentPlayer.remainingUnitsToPlace || 0
              
              if (unitsThisTurn >= 3) {
                alert("You've already placed 3 units this turn!")
                return
              }
              
              if (remainingUnits <= 0) {
                alert("You have no units left to place!")
                return
              }
              
              console.log('📍 Placing unit in setup phase!')
              await placeUnit(gameId, currentUserId, territoryId, 1)
            } else if (action === 'info') {
              setSelectedTerritory(selectedTerritory === territoryId ? null : territoryId)
            }
            break
            
          case 'land_commander':
            if (action === 'place_commander') {
              const hasLandCommander = myPlayer?.territories.some(tId => 
                gameState.territories[tId]?.landCommander === currentUserId
              )
              
              if (hasLandCommander) {
                alert("You already have a Land Commander!")
                return
              }
              
              console.log('⛰️ Placing Land Commander!')
              await placeCommander(gameId, currentUserId, territoryId, 'land')
            } else if (action === 'info') {
              setSelectedTerritory(selectedTerritory === territoryId ? null : territoryId)
            }
            break
            
          case 'diplomat_commander':
            if (action === 'place_commander') {
              const hasDiplomatCommander = myPlayer?.territories.some(tId => 
                gameState.territories[tId]?.diplomatCommander === currentUserId
              )
              
              if (hasDiplomatCommander) {
                alert("You already have a Diplomat Commander!")
                return
              }
              
              console.log('👤 Placing Diplomat Commander!')
              await placeCommander(gameId, currentUserId, territoryId, 'diplomat')
            } else if (action === 'info') {
              setSelectedTerritory(selectedTerritory === territoryId ? null : territoryId)
            }
            break
            
          case 'space_base':
            if (action === 'place_base') {
              const hasSpaceBase = myPlayer?.territories.some(tId => 
                gameState.territories[tId]?.spaceBase === currentUserId
              )
              
              if (hasSpaceBase) {
                alert("You already have a Space Base!")
                return
              }
              
              console.log('🏰 Placing Space Base!')
              await placeSpaceBase(gameId, currentUserId, territoryId)
            } else if (action === 'info') {
              setSelectedTerritory(selectedTerritory === territoryId ? null : territoryId)
            }
            break
        }
        
        return // Exit early for setup phases
      }

      if (gameState.status === 'playing' && gameState.currentPhase === 2) {
        if (!isMyTurn) {
          alert("It's not your turn!");
          return;
        }
        
        // Build & Hire phase is handled by the overlay
        // Territory clicks during placement mode will be handled by the overlay
        if (action === 'info') {
          setSelectedTerritory(selectedTerritory === territoryId ? null : territoryId);
        }
        return; // Exit early for Build & Hire phase
      }
      
      // Regular game phase handling (existing code)
      switch (action) {
        case 'place':
          console.log('📍 Placing unit!')
          if (territory.ownerId === currentUserId) {
            await placeUnit(gameId, currentUserId, territoryId, 1)
            console.log('✅ Unit placed - useGameSync will handle the update')
          } else {
            alert('You can only place units on your own territories')
          }
          break
          
        case 'attack':
          console.log('🔥 Attack mode!')
          
          if (!selectedTerritory) {
            if (territory.ownerId === currentUserId) {
              setSelectedTerritory(territoryId)
              console.log(`🎯 Selected attacking territory: ${territory.name}`)
            } else {
              alert('You must select your own territory to attack from')
            }
          } else {
            if (territoryId === selectedTerritory) {
              setSelectedTerritory(null)
              console.log('❌ Attack cancelled')
            } else if (territory.ownerId === currentUserId) {
              setSelectedTerritory(territoryId)
              console.log(`🎯 Switched attacking territory: ${territory.name}`)
            } else {
              const fromTerritory = gameState.territories[selectedTerritory]
              const attackingUnits = Math.max(1, fromTerritory.machineCount - 1)
              
              console.log(`⚔️ Attacking ${territory.name} from ${fromTerritory.name} with ${attackingUnits} units`)
              
              await attackTerritory(gameId, currentUserId, selectedTerritory, territoryId, attackingUnits)
              setSelectedTerritory(null)
              console.log('✅ Attack completed - useGameSync will handle the update')
            }
          }
          break
          
        case 'fortify':
          console.log('🛡️ Fortify mode!')
          
          if (!selectedTerritory) {
            if (territory.ownerId === currentUserId && territory.machineCount > 1) {
              setSelectedTerritory(territoryId)
              console.log(`🎯 Selected source territory: ${territory.name}`)
            } else {
              alert('You must select your own territory with more than 1 unit')
            }
          } else {
            if (territoryId === selectedTerritory) {
              setSelectedTerritory(null)
              console.log('❌ Fortify cancelled')
            } else if (territory.ownerId === currentUserId) {
              const fromTerritory = gameState.territories[selectedTerritory]
              const unitsToMove = Math.floor((fromTerritory.machineCount - 1) / 2) || 1
              
              console.log(`🛡️ Fortifying ${territory.name} from ${fromTerritory.name} with ${unitsToMove} units`)
              
              await fortifyTerritory(gameId, currentUserId, selectedTerritory, territoryId, unitsToMove)
              setSelectedTerritory(null)
              console.log('✅ Fortify completed - useGameSync will handle the update')
            } else {
              alert('You can only fortify your own territories')
            }
          }
          break
          
        case 'info':
          console.log('ℹ️ Showing territory info!')
          setSelectedTerritory(selectedTerritory === territoryId ? null : territoryId)
          break

        case 'place_base':
          console.log('🏰 Placing space base!')
          if (territory.ownerId === currentUserId) {
            await placeSpaceBase(gameId, currentUserId, territoryId)
            console.log('✅ Space base placed - useGameSync will handle the update')
          } else {
            alert('You can only place space bases on your own territories')
          }
          break
          
        default:
          console.warn('Unknown action:', action)
      }
    } catch (error) {
      console.error(`❌ ${action} action failed:`, error)
      alert(`${action} failed: ${error.message}`)
    } finally {
      setTerritoryActionInProgress(false)
    }
  }

  const handleTerritoryClick = (territoryId) => {
    // Route to appropriate action based on game state and interaction mode
    if (gameState.status === 'setup') {
      switch (gameState.setupPhase) {
        case 'units':
          handleTerritoryAction(territoryId, interactionMode) // 'place' or 'info'
          break
        case 'land_commander':
        case 'diplomat_commander':
          handleTerritoryAction(territoryId, interactionMode === 'place_commander' ? 'place_commander' : 'info')
          break
        case 'space_base':
          handleTerritoryAction(territoryId, interactionMode === 'place_base' ? 'place_base' : 'info')
          break
      }
    } else {
      handleTerritoryAction(territoryId, interactionMode)
    }
  };

  const handleModeChange = (mode) => {
    setInteractionMode(mode);
    setSelectedTerritory(null);
  };

  const handlePlaceUnitFromOverlay = async (territoryId: string) => {
    try {
      console.log(`📍 Placing unit on territory ${territoryId}`)
      await placeUnit(gameId, currentUserId, territoryId, 1)
      console.log('✅ Unit placed - useGameSync will handle the update')
    } catch (error) {
      console.error('❌ Unit placement failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to place unit: ${errorMessage}`)
      throw error
    }
  }

  const handlePurchaseCommander = async (commanderType: string, cost: number) => {
    try {
      console.log(`🛒 Purchasing ${commanderType} commander for ${cost} energy`);
      await purchaseCommander(gameId, currentUserId, commanderType as any, cost);
      console.log('✅ Commander purchase completed - useGameSync will handle the update');
    } catch (error) {
      console.error('❌ Commander purchase failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to purchase commander: ${errorMessage}`);
      throw error;
    }
  };

  const handlePlaceCommander = async (territoryId: string, commanderType: string) => {
    try {
      console.log(`📍 Placing ${commanderType} commander on territory ${territoryId}`);
      await placeCommanderInGame(gameId, currentUserId, territoryId, commanderType as any);
      console.log('✅ Commander placement completed - useGameSync will handle the update');
    } catch (error) {
      console.error('❌ Commander placement failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to place commander: ${errorMessage}`);
      throw error;
    }
  };

  const handlePurchaseSpaceBase = async (cost: number) => {
    try {
      console.log(`🏰 Purchasing space base for ${cost} energy`);
      await purchaseSpaceBaseGame(gameId, currentUserId, cost);
      console.log('✅ Space base purchase completed - useGameSync will handle the update');
    } catch (error) {
      console.error('❌ Space base purchase failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to purchase space base: ${errorMessage}`);
      throw error;
    }
  };

  const handlePlaceSpaceBase = async (territoryId: string) => {
    try {
      console.log(`🏰 Placing space base on territory ${territoryId}`);
      await placeSpaceBaseInGame(gameId, currentUserId, territoryId);
      console.log('✅ Space base placement completed - useGameSync will handle the update');
    } catch (error) {
      console.error('❌ Space base placement failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to place space base: ${errorMessage}`);
      throw error;
    }
  };

  const handleAdvanceFromBuildHire = async () => {
    try {
      console.log('🎯 Advancing from Build & Hire to Buy Cards phase');
      await advanceFromBuildHire(gameId, currentUserId);
      console.log('✅ Phase advance completed - useGameSync will handle the update');
    } catch (error) {
      console.error('❌ Phase advance failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to advance phase: ${errorMessage}`);
      throw error;
    }
  };

  

  // 🎨 ENHANCED: Setup phase display with themed descriptions
  const getPhaseDisplay = () => {
    if (gameState?.status === 'setup') {
      switch (gameState.setupPhase) {
        case 'units':
          return 'Setup: Deploy Forces (3 per turn)'
        case 'land_commander':
          return 'Setup: Deploy Land Commander ⛰️'
        case 'diplomat_commander':
          return 'Setup: Deploy Diplomat 👤'
        case 'space_base':
          return 'Setup: Build Space Base 🏰'
        default:
          return 'Setup Phase'
      }
    }
    
    // 🎯 ENHANCED: Better bidding phase display
    if (gameState?.status === 'bidding') {
      const year = gameState.bidding?.year || 1
      if (!gameState.bidding?.bidsRevealed) {
        const waitingCount = gameState.bidding?.playersWaitingToBid?.length || 0
        if (waitingCount === 0) {
          return `Year ${year}: Revealing Bids! 🎉`
        }
        return `Year ${year}: Energy Bidding 💰 (${waitingCount} waiting)`
      } else if (gameState.bidding?.tiebreakRoll) {
        return `Year ${year}: Tiebreaker! 🎲`
      } else {
        return `Year ${year}: Turn Order Set 🏆`
      }
    }
    
    // Main game phases
    if (gameState?.status === 'playing') {
      const year = gameState.currentYear || 1
      const phase = gameState.currentPhase
      const phaseNames = {
        1: 'Collect & Deploy',
        2: 'Build & Hire', 
        3: 'Buy Cards',
        4: 'Play Cards',
        5: 'Invade',
        6: 'Fortify'
      }
      return `Year ${year}: ${phaseNames[phase] || `Phase ${phase}`}`
    }
    
    return 'Unknown Phase'
  }

  // Get setup progress for current player
  const getSetupProgress = () => {
    if (!myPlayer || gameState?.status !== 'setup') return null
    
    switch (gameState.setupPhase) {
      case 'units':
        return `${myPlayer.remainingUnitsToPlace || 0} units remaining`
      case 'land_commander':
        const hasLandCommander = myPlayer.territories.some(tId => 
          gameState.territories[tId]?.landCommander === currentUserId
        )
        return hasLandCommander ? 'Land Commander deployed ⛰️✅' : 'Need Land Commander ⛰️'
      case 'diplomat_commander':
        const hasDiplomatCommander = myPlayer.territories.some(tId => 
          gameState.territories[tId]?.diplomatCommander === currentUserId
        )
        return hasDiplomatCommander ? 'Diplomat deployed 👤✅' : 'Need Diplomat 👤'
      case 'space_base':
        const hasSpaceBase = myPlayer.territories.some(tId => 
          gameState.territories[tId]?.spaceBase === currentUserId
        )
        return hasSpaceBase ? 'Space Base built 🏰✅' : 'Need Space Base 🏰'
      default:
        return null
    }
  }

  // 🎨 GET CURRENT SETUP PHASE BUTTON CONFIG
  const getCurrentSetupButton = () => {
    switch (gameState.setupPhase) {
      case 'units':
        return { icon: Plus, label: "Deploy Unit", color: "green" }
      case 'land_commander':
        return { icon: Mountain, label: "Land Commander", color: "amber" }
      case 'diplomat_commander':
        return { icon: User, label: "Diplomat", color: "blue" }
      case 'space_base':
        return { icon: Castle, label: "Space Base", color: "purple" }
      default:
        return { icon: Plus, label: "Deploy", color: "green" }
    }
  }

  const handleSubmitBid = async (amount: number) => {
    try {
      console.log(`💰 Submitting bid: ${amount} energy`)
      await submitBid(gameId, currentUserId, amount)
      console.log('✅ Bid submitted - useGameSync will handle the update')
    } catch (error) {
      console.error('❌ Bid submission failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to submit bid: ${errorMessage}`)
      throw error
    }
  }

  const handleStartYearTurns = async () => {
    try {
      console.log('🎮 Starting year turns...')
      await startYearTurns(gameId)
      console.log('✅ Year turns started - useGameSync will handle the update')
    } catch (error) {
      console.error('❌ Failed to start year turns:', error)
      throw error
    }
  }

  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col relative overflow-hidden">
      {/* ✅ FIXED: Connection Status Indicator - Higher z-index, better positioning */}
      {!isConnected && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg z-40 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-pulse rounded-full h-4 w-4 bg-white"></div>
            <span className="text-sm font-medium">Reconnecting to game server...</span>
          </div>
        </div>
      )}

      {/* ✅ FIXED: Loading Indicator - Better positioning to avoid UI conflicts */}
      {isUpdating && (
        <div className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg z-40 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm font-medium">Updating...</span>
          </div>
        </div>
      )}

      {/* 🚨 EMERGENCY FIX: AI Turn Indicator - SMALL, NON-BLOCKING, WITH EMERGENCY ACCESS */}
      {isAITurn && (
        <div className="absolute top-16 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-2 rounded-lg z-30 shadow-lg max-w-xs">
          <div className="flex items-center space-x-2">
            <div className="animate-pulse rounded-full h-2 w-2 bg-white"></div>
            <span className="text-xs font-medium">
              🤖 AI {gameState?.status === 'setup' ? 'setting up' : 'thinking'}
            </span>
            {/* 🚨 EMERGENCY: Always show restart button when AI is active */}
            <button
              onClick={() => handleGameStateUpdate({}, true)}
              className="ml-2 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
              title="Restart Game (Emergency)"
            >
              ⚠️ Restart
            </button>
          </div>
        </div>
      )}

      {/* Top Bar - Z-index 20 */}
      <div className="bg-white/10 backdrop-blur-sm text-white p-4 flex items-center justify-between z-20">
        <button
          onClick={() => setShowStats(!showStats)}
          className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          <Menu size={20} />
        </button>
        
        <div className="text-center">
          <div className="text-sm opacity-90">
            {getPhaseDisplay()}
          </div>
          <div className={`text-xs px-2 py-1 rounded-full ${
            isMyTurn ? 'bg-green-500' : 'bg-yellow-500'
          }`}>
            {isMyTurn ? 'Your Turn' : `${currentPlayer?.name}'s Turn`}
          </div>
          {/* Setup progress indicator */}
          {gameState?.status === 'setup' && (
            <div className="text-xs text-green-300 mt-1">
              {getSetupProgress()}
            </div>
          )}
          <div className={`text-xs mt-1 ${isConnected ? 'text-green-300' : 'text-red-300'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Main Map Area - Z-index 10 */}
      <div className="flex-1 relative z-10">
        <GameMap
          gameState={gameState}
          selectedTerritory={selectedTerritory}
          onTerritoryClick={handleTerritoryClick}
          interactionMode={interactionMode}
        />
      </div>

      {/* ✅ FIXED: Bottom Action Bar - Z-index 20, CLEAR SPACE ABOVE */}
      <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 z-20">
        {gameState?.status === 'setup' ? (
          // 🎨 Setup phase buttons with themed icons
          <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
             <GameActionButton
                icon={Info}
                label="Info"
                disabled={false}
                active={interactionMode === 'info'}
                onClick={() => handleModeChange('info')}
                color="blue"
              />
            
            {/* Current phase button */}
            {(() => {
              const currentButton = getCurrentSetupButton()
              const actionMode = gameState.setupPhase === 'units' ? 'place' :
                              gameState.setupPhase === 'space_base' ? 'place_base' : 'place_commander'
              
              return (
                <GameActionButton
                  icon={currentButton.icon}
                  label={currentButton.label}
                  active={interactionMode === actionMode}
                  disabled={!isMyTurn}
                  onClick={() => handleModeChange(actionMode)}
                  color={currentButton.color}
                />
              )
            })()}
            
            {/* Fixed preview buttons */}
            {gameState.setupPhase === 'units' && (
              <>
                <GameActionButton
                  icon={Mountain}
                  label="Land Next"
                  active={false}
                  disabled={true}
                  onClick={() => {}}
                  color="gray"
                />
                <GameActionButton
                  icon={User}
                  label="Diplomat Next"
                  active={false}
                  disabled={true}
                  onClick={() => {}}
                  color="gray"
                />
              </>
            )}
            
            {gameState.setupPhase === 'land_commander' && (
              <>
                <GameActionButton
                  icon={User}
                  label="Diplomat Next"
                  active={false}
                  disabled={true}
                  onClick={() => {}}
                  color="gray"
                />
                <GameActionButton
                  icon={Castle}
                  label="Base Later"
                  active={false}
                  disabled={true}
                  onClick={() => {}}
                  color="gray"
                />
              </>
            )}
            
            {gameState.setupPhase === 'diplomat_commander' && (
              <>
                <GameActionButton
                  icon={Castle}
                  label="Base Next"
                  active={false}
                  disabled={true}
                  onClick={() => {}}
                  color="gray"
                />
                <GameActionButton
                  icon={Sword}
                  label="Game Soon"
                  active={false}
                  disabled={true}
                  onClick={() => {}}
                  color="gray"
                />
              </>
            )}

            {gameState.setupPhase === 'space_base' && (
              <>
                <GameActionButton
                  icon={Sword}
                  label="Game Next"
                  active={false}
                  disabled={true}
                  onClick={() => {}}
                  color="gray"
                />
                <GameActionButton
                  icon={Crown}
                  label="Victory!"
                  active={false}
                  disabled={true}
                  onClick={() => {}}
                  color="gray"
                />
              </>
            )}
          </div>
        ) : gameState?.status === 'playing' ? (
          // 🎮 MAIN GAME: Fixed phase buttons with correct numbers
          <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
            <GameActionButton
              icon={Info}
              label="Info"
              active={interactionMode === 'info'}
              disabled={false}
              onClick={() => handleModeChange('info')}
              color="blue"
            />
            
            {/* Deploy Units - Phase 1 */}
            <GameActionButton
              icon={Plus}
              label="Deploy"
              active={interactionMode === 'place'}
              disabled={!isMyTurn || gameState?.currentPhase !== 1}
              onClick={() => handleModeChange('place')}
              color="green"
            />
            
            {/* Build & Hire - Phase 2 */}
            <GameActionButton
              icon={Castle}
              label="Build"
              active={interactionMode === 'build'}
              disabled={!isMyTurn || gameState?.currentPhase !== 2}
              onClick={() => handleModeChange('build')}
              color="purple"
            />
            
            {/* Attack - Phase 5 */}
            <GameActionButton
              icon={Sword}
              label="Attack"
              active={interactionMode === 'attack'}
              disabled={!isMyTurn || gameState?.currentPhase !== 5}
              onClick={() => handleModeChange('attack')}
              color="red"
            />
            
            {/* Fortify - Phase 6 */}
            <GameActionButton
              icon={Shield}
              label="Fortify"
              active={interactionMode === 'fortify'}
              disabled={!isMyTurn || gameState?.currentPhase !== 6}
              onClick={() => handleModeChange('fortify')}
              color="yellow"
            />
          </div>
        ) : (
          // 🎯 BIDDING OR OTHER STATES: Simple info button
          <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
            <GameActionButton
              icon={Info}
              label="View Info"
              active={interactionMode === 'info'}
              disabled={false}
              onClick={() => handleModeChange('info')}
              color="blue"
            />
          </div>
        )}

        {/* 🎨 ENHANCED: Action Instructions with themed descriptions */}
         <div className="mt-3 text-center">
          <div className="text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-2 inline-block">
            {gameState?.status === 'setup' ? (
              // Setup instructions with emojis
              <>
                {interactionMode === 'info' && 'Tap territories to view details ℹ️'}
                {interactionMode === 'place' && gameState.setupPhase === 'units' && 'Tap your territories to deploy units (3 per turn) 📍'}
                {interactionMode === 'place_commander' && gameState.setupPhase === 'land_commander' && 'Tap your territory to deploy Land Commander ⛰️'}
                {interactionMode === 'place_commander' && gameState.setupPhase === 'diplomat_commander' && 'Tap your territory to deploy Diplomat 👤'}
                {interactionMode === 'place_base' && gameState.setupPhase === 'space_base' && 'Tap your territory to build Space Base 🏰'}
              </>
            ) : gameState?.status === 'playing' ? (
              // Main game instructions
              <>
                {interactionMode === 'info' && 'Tap territories to view details ℹ️'}
                {interactionMode === 'place' && gameState.currentPhase === 1 && 'Deploy units on your territories 📍'}
                {interactionMode === 'attack' && gameState.currentPhase === 5 && 'Attack enemy territories ⚔️'}
                {interactionMode === 'fortify' && gameState.currentPhase === 6 && 'Move units between territories 🛡️'}
                {!isMyTurn && `Waiting for ${currentPlayer?.name} to complete phase ${gameState.currentPhase} 🕒`}
                {isMyTurn && gameState.currentPhase !== 1 && gameState.currentPhase !== 5 && gameState.currentPhase !== 6 && `Phase ${gameState.currentPhase} - Use info to view territories 💡`}
              </>
            ) : gameState?.status === 'bidding' ? (
              'Energy bidding in progress 💰'
            ) : (
              'Game state unknown'
            )}
          </div>
        </div>
      </div>

      {/* Stats Sidebar - Z-index 50 */}
      {showStats && (
        <div className="absolute inset-y-0 left-0 w-80 bg-black/50 backdrop-blur-sm z-50 p-4 transform transition-transform duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold">Game Stats</h2>
            <button
              onClick={() => setShowStats(false)}
              className="text-white p-1 hover:bg-white/20 rounded"
            >
              <X size={20} />
            </button>
          </div>
          <GameStats gameState={gameState} currentUserId={currentUserId} />
        </div>
      )}

      {/* 🚨 EMERGENCY ACCESS: Always show emergency restart button when AI is thinking too long */}
      {isAITurn && (
        <div className="absolute top-20 left-4 z-50">
          <button
            onClick={() => {
              if (confirm('AI seems stuck. Restart the game?')) {
                handleGameStateUpdate({}, true);
              }
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg shadow-lg transition-colors"
            title="Emergency Restart - AI Stuck"
          >
            🚨 Emergency Restart
          </button>
        </div>
      )}

      {/* Settings Panel - Z-index 50 - ALWAYS ACCESSIBLE */}
      {showSettings && (
        <div className="absolute inset-y-0 right-0 w-80 bg-black/50 backdrop-blur-sm z-80 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold">Settings</h2>
            <button
              onClick={() => setShowSettings(false)}
              className="text-white p-1 hover:bg-white/20 rounded"
            >
              <X size={20} />
            </button>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 space-y-3">
            <button 
              onClick={() => handleGameStateUpdate({}, true)}
              className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Restart Game
            </button>
            <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              Game Rules
            </button>
            <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              End Game
            </button>
          </div>
        </div>
      )}

      {/* Overlay for sidebar backgrounds - Z-index 45 */}
      {(showStats || showSettings) && (
        <div 
          className="absolute inset-0 bg-black/30 z-45"
          onClick={() => {
            setShowStats(false);
            setShowSettings(false);
          }}
        />
      )}

      {/* 🎯 Bidding overlay - Z-index 60 (highest priority) */}
      {gameState?.status === 'bidding' && (
        <BiddingOverlay
          gameState={gameState}
          currentUserId={currentUserId}
          onSubmitBid={handleSubmitBid}
          onStartYearTurns={handleStartYearTurns}
        />
      )}

      {/* 🎯 Collect & Deploy overlay - Z-index 60 (highest priority) */}
      {gameState?.status === 'playing' && gameState?.currentPhase === 1 && isMyTurn && (
        <CollectDeployOverlay
          gameState={gameState}
          currentUserId={currentUserId}
          onCollectAndStartDeploy={handleCollectAndStartDeploy}
          onPlaceUnit={handlePlaceUnitFromOverlay}
          onConfirmDeploymentComplete={handleConfirmDeploymentComplete}
        />
      )}

      {/* 🎯 Build & Hire overlay - Z-index 60 (highest priority) */}
      {gameState?.status === 'playing' && gameState?.currentPhase === 2 && (
        <BuildHireOverlay
          gameState={gameState}
          currentUserId={currentUserId}
          onPurchaseCommander={handlePurchaseCommander}
          onPlaceCommander={handlePlaceCommander}
          onPurchaseSpaceBase={handlePurchaseSpaceBase}
          onPlaceSpaceBase={handlePlaceSpaceBase}
          onAdvanceToNextPhase={handleAdvanceFromBuildHire}
        />
      )}
    </div>
  );
};

export default MobileGameUI;