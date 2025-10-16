// app/components/Game/MobileGameUI.tsx
'use client'
import BuildHireOverlay from '@/app/components/Game/GamePhases/BuildHireOverlay';
import GameRules from '@/app/components/Game/GameRules/GameRules';
import {
  submitBid,
  startYearTurns,
  purchaseAndPlaceCommander,
  purchaseAndPlaceSpaceBase,
  advanceFromBuildHire,
  invadeTerritory,
  moveIntoEmptyTerritory, 
  startInvasionPhase,
  confirmConquest  // ✅ CHANGED: Use new server action
} from '@/app/serverActions/gameActions';
import { useState } from 'react';
import { useGameSync } from '@/app/hooks/useGameSync';
import BiddingOverlay from '@/app/components/Game/GameBidding/BiddingOverlay';
import CollectDeployOverlay from '@/app/components/Game/GamePhases/CollectDeployOverlay';
import BuyCardsOverlay from '@/app/components/Game/GamePhases/BuyCardsOverlay';
import PlayCardsOverlay from '@/app/components/Game/GamePhases/PlayCardsOverlay';
import InvasionOverlay from '@/app/components/Game/GamePhases/InvasionOverlay';
import { 
  Settings, 
  Sword, 
  Shield, 
  Plus, 
  Info, 
  Menu, 
  X,
  Play,         // 🎮 Card Play Mode
  // 🎨 Themed commander icons
  User,         // 👤 Diplomat Commander
  Mountain,     // ⛰️ Land Commander
  Zap,          // ⚡ Nuke Commander
  Ship,         // 🚢 Water Commander
  Castle,       // 🏰 Space Base
  Rocket,       // 🚀 Alternative space icon
  Crown,        // 👑 Leadership
  BookOpen,     // 📚 Card Reference - ADD THIS
  Scroll        // 📜 Game Rules
} from 'lucide-react';
import { 
  restartGameWithNuking, 
  placeUnit,
  fortifyTerritory,
  placeCommander,
  placeSpaceBase,
  collectAndStartDeploy,
  confirmDeploymentComplete,
  purchaseCards,
  advanceFromBuyCards,
  playCard,
  advanceFromPlayCards
} from '@/app/serverActions/gameActions';
import { GameActionButton } from '@/app/components/Game/GameUtils/GameActionButton';
import { GameStats } from '@/app/components/Game/GameUtils/GameStats';
import { GameMap } from '@/app/components/Game/GameMap/GameMap';
import CardReferenceServerWrapper from '@/app/components/Game/Cards/CardReferenceServerWrapper';


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
  nuclear: Zap,            // ⚡ Nuclear Commander
  naval: Ship,          // 🚢 Naval Commander
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
      
      // Auto-set interaction mode based on setup phase
      if (newState.status === 'setup') {
        const currentPlayer = newState?.players[newState.currentPlayerIndex];
        if (currentPlayer?.id === currentUserId) {
          switch (newState.setupPhase) {
            case 'units':
              setInteractionMode('place');
              break;
            case 'land_commander':
            case 'diplomat_commander':
              setInteractionMode('place_commander');
              break;
            case 'space_base':
              setInteractionMode('place_base');
              break;
          }
        }
      }
      
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

  const [cardSelectedTerritories, setCardSelectedTerritories] = useState<string[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [interactionMode, setInteractionMode] = useState('info');
  //top right stats panel
  const [showStats, setShowStats] = useState(false);
  //top right settings panel
  const [showSettings, setShowSettings] = useState(false);
  //used for throbber
  const [isUpdating, setIsUpdating] = useState(false);
  const [territoryActionInProgress, setTerritoryActionInProgress] = useState(false);
  //explains all the cards in the game
  const [showCardReference, setShowCardReference] = useState(false);
  //game rules scroll container shows up
  const [showGameRules, setShowGameRules] = useState(false);
  
  const [buildHirePlacementMode, setBuildHirePlacementMode] = useState<{
    active: boolean;
    itemType: string;
    cost: number;
    territoryId?: string;
  } | null>(null);

  const [cardPlayMode, setCardPlayMode] = useState<{
    active: boolean;
    cardId: string;
    cardTitle: string;
    cardType: string;
    validTerritoryTypes: string[];
  } | null>(null);
  
  const [invasionState, setInvasionState] = useState<{
    isActive: boolean;
    fromTerritoryId: string | null;
    toTerritoryId: string | null;
  } | null>(null);

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

  const handleToggleCardReference = () => {
    setShowCardReference(!showCardReference);
  };

  const handleGameStateUpdate = async (newGameState: any, useServerAction: boolean = false) => {
    console.log('🔄 Game state update requested:', { useServerAction, newGameState })
    
    if (useServerAction) {
      setIsUpdating(true)
      try {
        const nukeCount = newGameState.actions?.[0]?.data?.nukedCount || 4
        console.log('🚀 Calling server action to restart game...')
        await restartGameWithNuking(gameId, currentUserId, 'player-2', nukeCount)
        console.log('✅ Server action completed - useGameSync will handle the update')
      } catch (error:any) {
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

  // Add this handler for card play mode
  const handleEnterCardPlayMode = (cardId: string, cardData: any) => {
    console.log('🃏 DEBUG: Card play mode data:', {
      cardId,
      cardData,
      cardTitle: cardData?.cardTitle,
      commanderType: cardData?.commanderType || cardData?.cardType
    });

    const cardType = cardData.commanderType || cardData.cardType;
    let validTypes: string[] = [];
    
    switch (cardData.cardTitle) {
      case 'Assemble MODs':
      case 'Territorial Station':
        validTypes = cardType === 'naval' ? ['water'] : ['land']; // ✅ Fixed: no lava
        break;
      default:
        validTypes = ['land', 'water']; // ✅ Fixed: no lava
    }
    
    setCardPlayMode({
      active: true,
      cardId: cardId,
      cardTitle: cardData.cardTitle,
      cardType: cardType,
      validTerritoryTypes: validTypes
    });
  };

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
          
          // ✅ ENHANCED: Invasion phase handling (Phase 5)
          if (gameState.status === 'playing' && gameState.currentPhase === 5) {
            if (!selectedTerritory) {
              if (territory.ownerId === currentUserId) {
                // Check if territory is attack-locked
                const myPlayer = gameState.players.find(p => p.id === currentUserId);
                const attackLockedTerritories = myPlayer?.invasionStats?.territoriesAttackedFrom || [];

                if (attackLockedTerritories.includes(territoryId)) {
                  alert('This territory has already attacked this turn and is locked down');
                  return;
                }

                if (territory.machineCount <= 1) {
                  alert('This territory needs more than 1 unit to attack (must leave 1 behind)');
                  return;
                }

                setSelectedTerritory(territoryId);
                console.log(`🎯 Selected attacking territory: ${territory.name}`);
              } else {
                alert('You must select your own territory to attack from');
              }
            } else {
              if (territoryId === selectedTerritory) {
                setSelectedTerritory(null);
                console.log('❌ Attack cancelled');
              } else if (territory.ownerId === currentUserId) {
                setSelectedTerritory(territoryId);
                console.log(`🎯 Switched attacking territory: ${territory.name}`);
              } else {
                // Open invasion overlay instead of immediate attack
                console.log(`⚔️ Opening invasion overlay: ${gameState.territories[selectedTerritory].name} → ${territory.name}`);
                
                setInvasionState({
                  isActive: true,
                  fromTerritoryId: selectedTerritory,
                  toTerritoryId: territoryId
                });
                
                // Don't clear selectedTerritory yet - keep it for potential follow-up attacks
              }
            }
            return; // Exit early for invasion phase
          }
          break;
          
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

  const getRequiredTargetCount = (cardTitle: string) => {
    switch (cardTitle) {
      case 'Assemble MODs':
      case 'Territorial Station':
        return 1;
      case 'Reinforcements':
        return 3;
      default:
        return 1;
    }
  };

  const handleTerritoryClick = (territoryId: string) => {

    // Card play mode - handle territory selection for cards
    // Card play mode - handle territory selection for cards
    if (cardPlayMode?.active) {
      const territory = gameState.territories[territoryId];
      if (!territory) {
        alert('Invalid territory selected');
        return;
      }
      
      // Validation
      if (territory.ownerId !== currentUserId) {
        alert('You can only target territories you control');
        return;
      }
      
      if (!cardPlayMode.validTerritoryTypes.includes(territory.type)) {
        alert(`This card requires a ${cardPlayMode.validTerritoryTypes.join(' or ')} territory`);
        return;
      }
      
      // Get required target count for this card
      const requiredTargets = getRequiredTargetCount(cardPlayMode.cardTitle);
      
      // Toggle territory selection
      const isAlreadySelected = cardSelectedTerritories.includes(territoryId);
      let newSelectedTerritories: string[];
      
      if (isAlreadySelected) {
        // Remove if already selected
        newSelectedTerritories = cardSelectedTerritories.filter(id => id !== territoryId);
      } else {
        // Add if not selected (but don't exceed required count)
        if (cardSelectedTerritories.length >= requiredTargets) {
          alert(`This card only requires ${requiredTargets} territories. Deselect one first.`);
          return;
        }
        newSelectedTerritories = [...cardSelectedTerritories, territoryId];
      }
      
      setCardSelectedTerritories(newSelectedTerritories);
      
      // If we have enough territories, show confirmation
      if (newSelectedTerritories.length === requiredTargets) {
        const territoryNames = newSelectedTerritories
          .map(id => gameState.territories[id].name)
          .join(', ');
        
        const confirmPlay = confirm(
          `Play ${cardPlayMode.cardTitle} on: ${territoryNames}?\n\n` +
          `${getCardEffect(cardPlayMode)}`
        );
        
        if (confirmPlay) {
          // Play the card with all selected territories
          handlePlayCard(cardPlayMode.cardId, newSelectedTerritories);
          
          // Reset card play mode
          setCardPlayMode(null);
          setCardSelectedTerritories([]);
        }
      }
      
      return; // Exit early when in card play mode
    }

   

    // Build & Hire phase - Phase 2: Territory selection during placement
    if (gameState.status === 'playing' && gameState.currentPhase === 2 && buildHirePlacementMode?.active && !buildHirePlacementMode.territoryId) {
      // Validate territory selection
      const territory = gameState.territories[territoryId];
      if (!territory) {
        alert('Invalid territory selected');
        return;
      }

      if (territory.ownerId !== currentUserId) {
        alert('You can only place on territories you control');
        return;
      }

      // For space base - check if territory already has space base
      if (buildHirePlacementMode.itemType === 'space_base' && territory.spaceBase === currentUserId) {
        alert('This territory already has a space base');
        return;
      }

      // For commanders - check if territory already has this commander type
      if (buildHirePlacementMode.itemType !== 'space_base') {
        const commanderField = `${buildHirePlacementMode.itemType}Commander`;
        if (territory[commanderField] === currentUserId) {
          alert(`This territory already has a ${buildHirePlacementMode.itemType} commander`);
          return;
        }
      }

      // Valid selection - move to confirmation phase
      setBuildHirePlacementMode({
        ...buildHirePlacementMode,
        territoryId: territoryId
      });
      return;
    }

    // Regular Build & Hire info clicks
    if (gameState.status === 'playing' && gameState.currentPhase === 2) {
      if (interactionMode === 'info') {
        setSelectedTerritory(selectedTerritory === territoryId ? null : territoryId);
      }
      return;
    }

    // ... rest of your existing handleTerritoryClick logic for setup and other phases
    if (gameState.status === 'setup') {
      switch (gameState.setupPhase) {
        case 'units':
          handleTerritoryAction(territoryId, interactionMode)
          break
        case 'land_commander':
        case 'diplomat_commander':
          handleTerritoryAction(territoryId, 'place_commander')  // Always use place_commander action
          break
        case 'space_base':
          handleTerritoryAction(territoryId, interactionMode === 'place_base' ? 'place_base' : 'info')
          break
      }
    } else {
      handleTerritoryAction(territoryId, interactionMode)
    }
  };

  const handleModeChange = (mode: string) => {
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

  const handleStartBuildHirePlacement = (itemType: string, cost: number) => {
    setBuildHirePlacementMode({ active: true, itemType, cost });
  };

  const handleCancelBuildHirePlacement = () => {
    setBuildHirePlacementMode(null);
  };

  const handleCompleteBuildHirePlacement = () => {
    setBuildHirePlacementMode(null);
  };

  const handleConfirmConquest = async (additionalUnits: number) => {
    try {
      console.log('📦 Phase 2: Confirming conquest with additional units:', additionalUnits);
      
      // ✅ CHANGED: Use new confirmConquest server action
      await confirmConquest(gameId, currentUserId, additionalUnits);
      
      // ✅ Reset invasion state after successful conquest
      setInvasionState(null);
      
      console.log('✅ Conquest confirmed - useGameSync will handle the update');
    } catch (error) {
      console.error('❌ Conquest confirmation failed:', error);
      alert(`Conquest confirmation failed: ${error.message}`);
    }
  };

  // ✅ NEW: Combined purchase and place commander handler
  const handlePurchaseAndPlaceCommander = async (territoryId: string, commanderType: string, cost: number) => {
    try {
      console.log(`🛒🏗️ Purchasing and placing ${commanderType} commander on territory ${territoryId} for ${cost} energy`);
      await purchaseAndPlaceCommander(gameId, currentUserId, territoryId, commanderType as any, cost);
      console.log('✅ Commander purchase and placement completed - useGameSync will handle the update');
    } catch (error) {
      console.error('❌ Commander purchase and placement failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to purchase and place commander: ${errorMessage}`);
      throw error;
    }
  };

  // ✅ NEW: Combined purchase and place space base handler  
  const handlePurchaseAndPlaceSpaceBase = async (territoryId: string, cost: number) => {
    try {
      console.log(`🛒🏰 Purchasing and placing space base on territory ${territoryId} for ${cost} energy`);
      await purchaseAndPlaceSpaceBase(gameId, currentUserId, territoryId, cost);
      console.log('✅ Space base purchase and placement completed - useGameSync will handle the update');
    } catch (error) {
      console.error('❌ Space base purchase and placement failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to purchase and place space base: ${errorMessage}`);
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

  const handlePurchaseCards = async (selectedCards) => {
    try {
      console.log('🛒 Purchasing cards:', selectedCards);
      await purchaseCards(gameId, currentUserId, selectedCards);
      console.log('✅ Cards purchased - useGameSync will handle the update');
    } catch (error) {
      console.error('❌ Card purchase failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to purchase cards: ${errorMessage}`);
      throw error;
    }
  };

  const handleAdvanceFromBuyCards = async () => {
    try {
      console.log('🎯 Advancing from Buy Cards to Play Cards phase');
      await advanceFromBuyCards(gameId, currentUserId);
      console.log('✅ Phase advance completed - useGameSync will handle the update');
    } catch (error) {
      console.error('❌ Phase advance failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to advance phase: ${errorMessage}`);
      throw error;
    }
  };

  const handlePlayCard = async (cardId: string, targets?: string[]) => {
    try {
      console.log('🃏 Playing card:', cardId, 'with targets:', targets);
      await playCard(gameId, currentUserId, cardId, targets);
      console.log('✅ Card played - useGameSync will handle the update');
    } catch (error) {
      console.error('❌ Card play failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to play card: ${errorMessage}`);
      throw error;
    }
  };

  const handleAdvanceFromPlayCards = async () => {
    try {
      console.log('🎯 Advancing from Play Cards to Invade phase');
      await advanceFromPlayCards(gameId, currentUserId);
      console.log('✅ Phase advance completed - useGameSync will handle the update');
    } catch (error) {
      console.error('❌ Phase advance failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to advance phase: ${errorMessage}`);
      throw error;
    }
  };

  const getCardEffect = (cardMode: any) => {
    switch (cardMode.cardTitle) {
      case 'Assemble MODs':
        return "Place 3 MODs on this territory";
      case 'Reinforcements':
        return "Place 1 MOD on each of these 3 territories";
      case 'Colony Influence':
        return "Move your score marker ahead 3 spaces";
      case 'Territorial Station':
        return "Place a space station on this territory";
      case 'Scout Forces':
        return "Draw a land territory card and place 5 MODs on it";
      case 'Stealth MODs':
        return "Place 3 additional defending MODs";
      default:
        return "Apply card effect";
    }
  };

  const handleInvade = async (attackingUnits: number, commanderTypes: string[]) => {
    if (!invasionState || !invasionState.fromTerritoryId || !invasionState.toTerritoryId) {
      console.error('❌ Invasion state not properly set');
      return;
    }
    
    try {
      console.log('🎯 Phase 1: Resolving combat');
      
      // ✅ PHASE 1: Resolve Combat (this may set pendingConquest)
      await invadeTerritory(
        gameId,
        currentUserId,
        invasionState.fromTerritoryId,
        invasionState.toTerritoryId,
        attackingUnits,
        commanderTypes
      );
      
      // ✅ DON'T reset invasionState here - let the overlay handle the flow
      // InvasionOverlay will detect pendingConquest and transition to dice/move-in
      console.log('✅ Combat resolved - InvasionOverlay will handle next steps');
      
    } catch (error) {
      console.error('❌ Combat resolution failed:', error);
      alert(`Combat failed: ${error.message}`);
      // Only reset on error
      setInvasionState(null);
    }
  };

  const handleMoveIntoEmpty = async (movingUnits: number) => {
    if (!invasionState || !invasionState.fromTerritoryId || !invasionState.toTerritoryId) {
      console.error('❌ Invasion state not properly set');
      return;
    }
    
    try {
      await moveIntoEmptyTerritory(
        gameId,
        currentUserId,
        invasionState.fromTerritoryId,
        invasionState.toTerritoryId,
        movingUnits
      );
      setInvasionState(null);
    } catch (error) {
      console.error('❌ Movement failed:', error);
      alert(`Movement failed: ${error.message}`);
    }
  };

  const handleCancelInvasion = () => {
    setInvasionState(null);
  };

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
  
  const saveGameState = () => {
    try {
      const gameStateToSave = {
        ...gameState,
        timestamp: new Date().toISOString(),
        version: "1.0"
      };
      
      // ✅ OPTIMIZED: No formatting = smaller file size
      const dataStr = JSON.stringify(gameStateToSave);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `game-state-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      link.click();
      
      // ✅ IMPROVED: Show file size info
      const fileSizeKB = Math.round(dataBlob.size / 1024);
      console.log(`Game state saved successfully (${fileSizeKB}KB)`);
      
      // ✅ IMPROVED: User feedback with file info
      alert(`Game state saved successfully!\nFile size: ${fileSizeKB}KB`);
      
    } catch (error) {
      console.error('Failed to save game state:', error);
      alert('Failed to save game state: ' + error.message);
    }
  };

  const loadGameState = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // ✅ IMPROVED: Show file size
        const fileSizeKB = Math.round(file.size / 1024);
        console.log(`Loading game state file: ${file.name} (${fileSizeKB}KB)`);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const loadedState = JSON.parse(e.target.result);
            
            // ✅ ENHANCED: Better validation
            if (!loadedState.players || !loadedState.territories || !loadedState.status) {
              throw new Error('Invalid game state file - missing required fields');
            }
            
            // ✅ ENHANCED: Check for correct version
            if (loadedState.version && loadedState.version !== "1.0") {
              const confirmVersion = confirm(
                `This save file is version ${loadedState.version}, but current game expects version 1.0.\n` +
                `Loading may cause issues. Continue anyway?`
              );
              if (!confirmVersion) return;
            }
            
            // ✅ ENHANCED: Better confirmation dialog
            const saveDate = loadedState.timestamp ? 
              new Date(loadedState.timestamp).toLocaleString() : 'unknown time';
            
            const confirmLoad = confirm(
              `Load this saved game?\n\n` +
              `📅 Saved: ${saveDate}\n` +
              `🎮 Status: ${loadedState.status}\n` +
              `👥 Players: ${loadedState.players.map(p => p.name).join(', ')}\n` +
              `🎯 Phase: ${loadedState.currentPhase || 'unknown'}\n` +
              `📊 Year: ${loadedState.currentYear || 'unknown'}\n\n` +
              `⚠️ This will overwrite the current game!`
            );
            
            if (!confirmLoad) return;
            
            setIsUpdating(true);
            
            // ✅ ENHANCED: Better error handling for server communication
            try {
              const response = await fetch(`/api/game/${gameId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'load_game_state',
                  playerId: currentUserId,
                  gameState: loadedState
                })
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error ${response.status}: ${errorText}`);
              }
              
              const result = await response.json();
              console.log('Game state loaded successfully from:', saveDate);
              
              // ✅ IMPROVED: Better success message
              alert(
                `🎉 Game state loaded successfully!\n\n` +
                `📅 From: ${saveDate}\n` +
                `🎮 Status: ${result.status}\n` +
                `🎯 Current: Year ${result.currentYear}, Phase ${result.currentPhase}`
              );
              
            } catch (serverError) {
              console.error('Server error loading game state:', serverError);
              alert(`Failed to load game state on server: ${serverError.message}`);
            }
            
          } catch (parseError) {
            console.error('Failed to parse game state file:', parseError);
            alert(`Invalid game state file: ${parseError.message}`);
          } finally {
            setIsUpdating(false);
          }
        };
        
        // ✅ ENHANCED: Better error handling for file reading
        reader.onerror = () => {
          console.error('Failed to read file');
          alert('Failed to read the selected file');
          setIsUpdating(false);
        };
        
        reader.readAsText(file);
      };
      
      input.click();
    } catch (error) {
      console.error('Failed to initiate file load:', error);
      alert('Failed to open file selector: ' + error.message);
    }
  };

  // ✅ BONUS: Add a function to validate current game state before saving
  const validateGameStateForSave = (gameState) => {
    const issues = [];
    
    if (!gameState.players || gameState.players.length === 0) {
      issues.push('No players found');
    }
    
    if (!gameState.territories || Object.keys(gameState.territories).length === 0) {
      issues.push('No territories found');
    }
    
    if (!gameState.status) {
      issues.push('Game status missing');
    }
    
    // ✅ NEW: Check for pendingConquest consistency
    if (gameState.pendingConquest) {
      const pc = gameState.pendingConquest;
      if (!gameState.territories[pc.fromTerritoryId] || !gameState.territories[pc.toTerritoryId]) {
        issues.push('Pending conquest references invalid territories');
      }
    }
    
    return issues;
  };


  return (
    <div className="h-screen w-full bg-gradient-to-br from-zinc-900 via-stone-900 to-amber-950 flex flex-col relative overflow-hidden">
      {/* ✅ FIXED: Connection Status Indicator - Higher z-index, better positioning */}
      {!isConnected && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-900 to-orange-900 text-amber-100 px-4 py-2 rounded border-2 border-red-700/50 z-40 shadow-[0_4px_20px_rgba(153,27,27,0.6)]">
          <div className="flex items-center space-x-2">
            <div className="animate-pulse rounded-full h-4 w-4 bg-amber-300"></div>
            <span className="text-sm font-bold">Reconnecting to game server...</span>
          </div>
        </div>
      )}

      {/* ✅ FIXED: Loading Indicator - Better positioning to avoid UI conflicts */}
      {isUpdating && (
        <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-800 to-orange-900 text-amber-100 px-4 py-2 rounded border-2 border-amber-600/50 z-40 shadow-[0_4px_20px_rgba(180,83,9,0.6)]">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-200"></div>
            <span className="text-sm font-bold">Updating...</span>
          </div>
        </div>
      )}
      {/* 🎯 Card Play Mode Indicator */}
      {cardPlayMode?.active && (
        <div className="absolute top-16 left-4 right-4 bg-gradient-to-r from-lime-800/95 to-green-900/95 backdrop-blur-md text-amber-100 px-4 py-3 rounded border-2 border-lime-600/60 z-45 shadow-[0_4px_20px_rgba(77,124,15,0.6)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Play size={18} />
              <div>
                <div className="font-bold">Select Target Territory</div>
                <div className="text-xs opacity-90">
                  Playing: {cardPlayMode.cardTitle} - Select {getRequiredTargetCount(cardPlayMode.cardTitle)} {cardPlayMode.validTerritoryTypes.join('/')} territories
                  {cardSelectedTerritories.length > 0 && (
                    <span className="ml-2 bg-lime-500/40 px-2 py-1 rounded border border-lime-400/30">
                      {cardSelectedTerritories.length}/{getRequiredTargetCount(cardPlayMode.cardTitle)} selected
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                setCardPlayMode(null);
                setCardSelectedTerritories([]);
              }}
              className="bg-red-800 hover:bg-red-700 border border-red-600/50 px-3 py-1 rounded text-xs font-bold transition-colors shadow-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* 🚨 EMERGENCY FIX: AI Turn Indicator - SMALL, NON-BLOCKING, WITH EMERGENCY ACCESS */}
      {isAITurn && (
        <div className="absolute top-16 right-4 bg-gradient-to-r from-yellow-700 to-orange-700 text-amber-100 px-3 py-2 rounded border-2 border-yellow-600/60 z-30 shadow-[0_4px_15px_rgba(161,98,7,0.6)] max-w-xs">
          <div className="flex items-center space-x-2">
            <div className="animate-pulse rounded-full h-2 w-2 bg-amber-200"></div>
            <span className="text-xs font-bold">
              🤖 AI {gameState?.status === 'setup' ? 'setting up' : 'thinking'}
            </span>
            <button
              onClick={() => handleGameStateUpdate({}, true)}
              className="ml-2 px-2 py-1 bg-red-700 hover:bg-red-600 border border-red-600/50 text-white text-xs rounded transition-colors font-bold shadow-md"
              title="Restart Game (Emergency)"
            >
              ⚠️ Restart
            </button>
          </div>
        </div>
      )}


      {/* Top Bar - Z-index 20 */}
      <div className="bg-gradient-to-b from-amber-900/85 via-orange-900/80 to-red-900/75 backdrop-blur-sm text-amber-100 p-4 flex items-center justify-between z-20 border-b-2 border-amber-600/60 shadow-[0_4px_20px_rgba(120,53,15,0.4)]">
        <button
          onClick={() => setShowStats(!showStats)}
          className="p-2 rounded border-2 border-amber-600/50 bg-gradient-to-br from-amber-800 to-orange-900 hover:from-amber-700 hover:to-orange-800 transition-all shadow-md"
        >
          <Menu size={20} />
        </button>
        
        <div className="text-center">
          <div className="text-sm opacity-95 font-bold">
            {getPhaseDisplay()}
          </div>
          <div className={`text-xs px-2 py-1 rounded-full border ${
            isMyTurn 
              ? 'bg-lime-700 border-lime-500/50 shadow-[0_0_10px_rgba(132,204,22,0.4)]' 
              : 'bg-yellow-700 border-yellow-500/50'
          }`}>
            {isMyTurn ? 'Your Turn' : `${currentPlayer?.name}'s Turn`}
          </div>
          {gameState?.status === 'setup' && (
            <div className="text-xs text-lime-300 mt-1 font-semibold">
              {getSetupProgress()}
            </div>
          )}
          
          <div className={`text-xs mt-1 font-bold ${isConnected ? 'text-lime-300' : 'text-red-300'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded border-2 border-amber-600/50 bg-gradient-to-br from-amber-800 to-orange-900 hover:from-amber-700 hover:to-orange-800 transition-all shadow-md"
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
          cardSelectedTerritories={cardSelectedTerritories}
        />
      </div>

      {/* ✅ FIXED: Bottom Action Bar - Z-index 20, CLEAR SPACE ABOVE */}
      <div className="bg-gradient-to-b from-zinc-800/95 via-amber-900/92 to-orange-900/88 backdrop-blur-sm border-t-2 border-amber-600/60 p-4 z-20 shadow-[0_-4px_20px_rgba(120,53,15,0.3)]">

        {gameState?.status === 'setup' ? (
          // 🎨 Setup phase buttons with themed icons
          <div className="grid grid-cols-5 gap-3 max-w-md mx-auto">
             <GameActionButton
                icon={Info}
                label="Info"
                disabled={false}
                active={interactionMode === 'info'}
                onClick={() => handleModeChange('info')}
                color="blue"
              />
              
              {/* Current phase button - AUTO-ACTIVE when it's the current setup phase */}
              {(() => {
                const currentButton = getCurrentSetupButton()
                const actionMode = gameState.setupPhase === 'units' ? 'place' :
                                  gameState.setupPhase === 'space_base' ? 'place_base' : 'place_commander'
                
                return (
                  <GameActionButton
                    icon={currentButton.icon}
                    label={currentButton.label}
                    // ✅ FIX: Auto-active when it's my turn OR manually selected
                    active={
                      // Always active for commander phases when it's my turn
                      (isMyTurn && gameState.setupPhase === 'land_commander') || 
                      (isMyTurn && gameState.setupPhase === 'diplomat_commander') ||
                      // Always active for units phase when it's my turn
                      (isMyTurn && gameState.setupPhase === 'units') ||
                      (gameState.setupPhase === 'space_base' && interactionMode === 'place_base')
                    }
                    disabled={!isMyTurn}
                    onClick={() => handleModeChange(actionMode)}
                    color={currentButton.color}
                  />
                )
              })()}
            
            {/* Card Reference - Always Available in setup */}
            <GameActionButton
              icon={BookOpen}
              label="Cards"
              active={showCardReference}
              disabled={false}
              onClick={handleToggleCardReference}
              color="indigo"
            />
            
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
          <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto"> {/* Changed from grid-cols-4 to grid-cols-5 */}
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
              active={
                // Auto-active if it's phase 1 and my turn, OR manually selected
                (gameState?.currentPhase === 1 && isMyTurn) || 
                interactionMode === 'place'
              }
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
            
            {/* 🆕 Card Reference - Always Available */}
            <GameActionButton
              icon={BookOpen}
              label="Cards"
              active={showCardReference}
              disabled={false}
              onClick={handleToggleCardReference}
              color="indigo"
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
          <div className="text-xs text-amber-200 bg-gradient-to-r from-amber-950/80 to-orange-950/80 border border-amber-700/40 rounded-full px-3 py-2 inline-block shadow-inner font-semibold">
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
              🔄 Restart Game
            </button>
            
            <button 
              onClick={saveGameState}
              className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-green-800"
            >
              💾 Save Game State
            </button>
            
            <button 
              onClick={loadGameState}
              className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-800"
            >
              📂 Load Game State
            </button>
            
            <button 
              onClick={() => {
                setShowGameRules(true)
              }} 
              className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              📋 Game Rules
            </button>
            
            <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              🏁 End Game
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
          onPurchaseAndPlaceCommander={handlePurchaseAndPlaceCommander}
          onPurchaseAndPlaceSpaceBase={handlePurchaseAndPlaceSpaceBase}
          onAdvanceToNextPhase={handleAdvanceFromBuildHire}
          onStartPlacement={handleStartBuildHirePlacement}
          onCancelPlacement={handleCancelBuildHirePlacement}
          placementMode={buildHirePlacementMode}
        />
      )}

      {/* 🎯 Buy Cards overlay - Z-index 60 (highest priority) */}
      {gameState?.status === 'playing' && gameState?.currentPhase === 3 && (
        <BuyCardsOverlay
          gameState={gameState}
          currentUserId={currentUserId}
          onPurchaseCards={handlePurchaseCards}
          onAdvanceToNextPhase={handleAdvanceFromBuyCards}
        />
      )}

      {/* 🎯 Play Cards overlay - Z-index 60 (highest priority) */}
      {gameState?.status === 'playing' && gameState?.currentPhase === 4 && (
        <PlayCardsOverlay
          gameState={gameState}
          currentUserId={currentUserId}
          onPlayCard={handlePlayCard}
          onAdvanceToNextPhase={handleAdvanceFromPlayCards}
          onEnterCardPlayMode={handleEnterCardPlayMode}
        />
      )}

      {/* 🎯 Invasion overlay - Z-index 60 (highest priority) */}
      {gameState?.status === 'playing' && 
      gameState?.currentPhase === 5 && 
      invasionState?.isActive && 
      invasionState.fromTerritoryId && 
      invasionState.toTerritoryId && (
        <InvasionOverlay
          gameState={gameState}
          currentUserId={currentUserId}
          fromTerritoryId={invasionState.fromTerritoryId}
          toTerritoryId={invasionState.toTerritoryId}
          onInvade={handleInvade}
          onMoveIntoEmpty={handleMoveIntoEmpty}
          onConfirmConquest={handleConfirmConquest} // ✅ NEW
          onCancel={handleCancelInvasion}
        />
      )}

      {/* 🎯 Card Reference overlay - Z-index 65 (highest priority) */}
      {showCardReference && (
        <CardReferenceServerWrapper
          gameState={gameState}
          currentUserId={currentUserId}
          onClose={() => setShowCardReference(false)}
        />
      )}

      {/* 🎯 Game Rules overlay - Z-index 65 (highest priority) */}
      {showGameRules && (
        <GameRules
          gameState={gameState}
          currentUserId={currentUserId}
          onClose={() => setShowGameRules(false)}
        />
      )}
    </div>
  );
};

export default MobileGameUI;