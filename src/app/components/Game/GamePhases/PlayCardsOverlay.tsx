// app/components/Game/GamePhases/PlayCardsOverlay.tsx
'use client'

import { useState, useMemo } from 'react';
import { 
  X,
  Coins,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Zap,
  Eye,
  User,
  Mountain,
  Ship,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Star
} from 'lucide-react';

interface PlayCardsOverlayProps {
  gameState: any;
  currentUserId: string;
  onPlayCard: (cardId: string, targets?: string[]) => Promise<void>;
  onAdvanceToNextPhase: () => Promise<void>;
  onEnterCardPlayMode: (cardId: string, cardData: any) => void;
}

const PlayCardsOverlay = ({ 
  gameState, 
  currentUserId,
  onPlayCard,
  onAdvanceToNextPhase,
  onEnterCardPlayMode
}: PlayCardsOverlayProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Fixed: Add missing state variables
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [showTargetSelection, setShowTargetSelection] = useState(false);

  const myPlayer = gameState.players.find((p: any) => p.id === currentUserId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === currentUserId;

  const cardRequiresTargets = (card: any) => {
    const cardTitle = card.data?.cardTitle || card.name;
    switch (cardTitle) {
      case 'Assemble MODs':
        return true; // Needs 1 territory
      case 'Reinforcements': 
        return true; // Needs 3 territories
      case 'Territorial Station':
        return true; // Needs 1 territory
      case 'Colony Influence':
        return false; // No targets, but needs commander validation
      case 'Scout Forces':
        return false; // No targets needed (draws random territory)
      case 'Stealth MODs':
        return false; // Defensive card, played during opponent's attack
      default:
        return false;
    }
  };

  const canPlayCard = (card: any) => {
    const cardTitle = card.data?.cardTitle || card.name;
    const commanderType = card.data?.commanderType;
    
    // Check if player has required commander alive
    switch (cardTitle) {
      case 'Colony Influence':
        // Need alive commander of the card's type
        const hasRequiredCommander = myPlayer?.territories?.some(territoryId => {
          const territory = gameState.territories[territoryId];
          if (!territory) return false;
          
          switch (commanderType) {
            case 'diplomat':
              return territory.diplomatCommander === currentUserId;
            case 'land':
              return territory.landCommander === currentUserId;
            case 'naval':
              return territory.navalCommander === currentUserId;
            case 'nuclear':
              return territory.nuclearCommander === currentUserId;
            default:
              return false;
          }
        });
        
        return hasRequiredCommander;
        
      default:
        return true; // Most cards can be played without additional validation
    }
  };

  const getRequiredTargetCount = (card: any) => {
    const cardTitle = card.data?.cardTitle || card.name;
    switch (cardTitle) {
      case 'Assemble MODs':
      case 'Territorial Station':
        return 1;
      case 'Reinforcements':
        return 3;
      default:
        return 0;
    }
  };

  const getCardEffect = (card: any) => {
    const cardTitle = card.data?.cardTitle || card.name;
    switch (cardTitle) {
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

  const getCommanderIcon = (commanderType: string) => {
    switch (commanderType) {
      case 'land': return Mountain;
      case 'diplomat': return User;
      case 'naval': return Ship;
      case 'nuclear': return Zap;
      default: return Star;
    }
  };

  const getCommanderColor = (commanderType: string) => {
    switch (commanderType) {
      case 'land': return 'bg-amber-500';
      case 'diplomat': return 'bg-blue-500';
      case 'naval': return 'bg-cyan-500';
      case 'nuclear': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Filter cards that can be played in current phase
  const playableCards = useMemo(() => {
    if (!myPlayer?.cards) return [];
    
    return myPlayer.cards.filter((card: any) => {
      // Check if card can be played in current phase
      // Phase 4 = "Play Cards" phase, can only play Phase 0 cards (before invasions)
      const cardPhase = card.data?.phase;
      if (cardPhase !== 0) {
        return false; // Only Phase 0 cards can be played in Phase 4
      }
      
      // Check if player has enough energy (if card has cost)
      const cardCost = card.data?.cost || 0;
      if (cardCost > 0 && (myPlayer.energy || 0) < cardCost) {
        return false;
      }
      
      // Check if card can actually be played (commander requirements, etc.)
      if (!canPlayCard(card)) {
        return false;
      }
      
      return true;
    });
  }, [myPlayer?.cards, myPlayer?.energy, gameState.territories, currentUserId]);

  // All cards (for reference)
  const allCards = myPlayer?.cards || [];
  const unplayableCards = allCards.filter((card: any) => 
    !playableCards.find((pc: any) => pc.id === card.id)
  );

  // Fixed: Complete card play logic
  const handlePlayCard = async (cardId: string, targets?: string[]) => {
    console.log(`🃏 PLAY CARD: cardId=${cardId}, targets=${targets}`);
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      
      await onPlayCard(cardId, targets);
      // Clear selection after playing
      setSelectedCardId(null);
      setSelectedTargets([]);
      setShowTargetSelection(false);
    } catch (error) {
      console.error('Card play failed:', error);
      alert(`Failed to play card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardSelection = (cardId: string) => {
    const selectedCard = playableCards.find((c: any) => c.id === cardId);
    if (!selectedCard) return;
    
    if (cardRequiresTargets(selectedCard)) {
      // Enter territory selection mode via parent component
      onEnterCardPlayMode(cardId, selectedCard.data);
      setIsMinimized(true); // Minimize overlay to show map
    } else {
      // Play card immediately (no targets needed)
      handlePlayCard(cardId);
    }
  };

  // Fixed: Add missing helper functions
  const getPotentialTargets = (card: any) => {
    if (!card) return [];
    
    const cardTitle = card.data?.cardTitle || card.name;
    const targets: any[] = [];
    
    switch (cardTitle) {
      case 'Assemble MODs':
      case 'Reinforcements':
        // Return player's territories
        Object.entries(gameState.territories).forEach(([id, territory]: [string, any]) => {
          if (territory.ownerId === currentUserId) {
            targets.push({
              id,
              name: territory.name,
              type: 'territory',
              ownerId: territory.ownerId
            });
          }
        });
        break;
      default:
        break;
    }
    
    return targets;
  };

  const handleTargetToggle = (targetId: string) => {
    setSelectedTargets(prev => {
      if (prev.includes(targetId)) {
        return prev.filter(id => id !== targetId);
      } else {
        return [...prev, targetId];
      }
    });
  };

  const handlePlaySelectedCard = async () => {
    if (!selectedCardId) return;
    
    const selectedCard = playableCards.find((c: any) => c.id === selectedCardId);
    if (!selectedCard) return;
    
    const requiredTargets = getRequiredTargetCount(selectedCard);
    
    if (requiredTargets > 0 && selectedTargets.length !== requiredTargets) {
      alert(`Please select exactly ${requiredTargets} target(s) for this card`);
      return;
    }
    
    await handlePlayCard(selectedCardId, selectedTargets);
  };

  const handleSkip = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onAdvanceToNextPhase();
    } catch (error) {
      console.error('Phase advance failed:', error);
      alert(`Failed to advance phase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (gameState.status !== 'playing' || gameState.currentPhase !== 4) {
    return null;
  }

  if (!isMyTurn) {
    return (
      <div className="absolute top-14 left-0 right-0 bg-green-500/90 backdrop-blur-sm text-white p-3 z-40 shadow-lg">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <Play size={20} />
            <span className="font-medium">Play Cards Phase</span>
          </div>
          <div className="text-sm opacity-90 mt-1">
            Waiting for {currentPlayer?.name} to play cards...
          </div>
        </div>
      </div>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className="absolute top-16 left-4 right-4 bg-green-600/95 backdrop-blur-md text-white px-4 py-3 rounded-lg z-50 shadow-xl border border-green-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Play size={18} />
            <div>
              <div className="font-semibold">Play Cards Phase</div>
              <div className="text-xs opacity-90">
                {playableCards.length} playable, {allCards.length} total cards
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-sm bg-yellow-500/20 px-2 py-1 rounded">
              {myPlayer?.energy || 0} ⚡
            </div>
            
            <button
              onClick={handleSkip}
              disabled={isProcessing}
              className="bg-gray-500 hover:bg-gray-600 px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              Skip
            </button>
            
            <button
              onClick={() => setIsMinimized(false)}
              className="text-white hover:text-green-200 transition-colors"
              title="Expand Play Cards"
            >
              <ChevronDown size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-20 left-0 right-0 bottom-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-white/98 backdrop-blur-lg rounded-2xl w-full max-w-6xl max-h-[85vh] flex shadow-2xl mx-4 pointer-events-auto border border-gray-200">
        
        {/* Main Cards Section */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Play className="text-green-500" size={28} />
                <h2 className="text-2xl font-bold text-gray-800">Play Cards</h2>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-1 rounded-lg">
                  <Coins className="text-yellow-600" size={16} />
                  <span className="font-semibold text-yellow-800">{myPlayer?.energy || 0} Energy</span>
                </div>
                
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                  title="Minimize to see map"
                >
                  <ChevronUp size={20} />
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
              💡 <strong>Phase 4:</strong> Play cards with Phase 0 (before invasions). 
              Other phase cards can be played during their specific game moments.
            </div>
          </div>

          {/* Cards Display */}
          <div className="flex-1 overflow-y-auto p-6">
            {allCards.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Cards Available</h3>
                <p className="text-gray-500">
                  Buy cards in Phase 3 to have cards to play here
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Playable Cards */}
                {playableCards.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-green-600 mb-4 flex items-center">
                      <CheckCircle size={20} className="mr-2" />
                      Playable Cards ({playableCards.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {playableCards.map((card: any) => {
                        const IconComponent = getCommanderIcon(card.data?.commanderType);
                        const isSelected = selectedCardId === card.id;
                        const canAfford = (myPlayer?.energy || 0) >= (card.data?.cost || 0);

                        return (
                          <div
                            key={card.id}
                            className={`relative border-2 rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? 'border-green-500 bg-green-50 shadow-lg scale-105'
                                : canAfford
                                ? 'border-green-300 bg-white hover:shadow-lg hover:scale-102'
                                : 'border-red-300 bg-red-50 opacity-75'
                            }`}
                            onClick={() => handleCardSelection(card.id)}
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <div className={`p-2 rounded-full ${getCommanderColor(card.data?.commanderType)} text-white`}>
                                  <IconComponent size={16} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-gray-800">{card.data?.cardTitle || card.name}</h4>
                                  <p className="text-xs text-gray-500 capitalize">{card.data?.commanderType}</p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-xs text-gray-500">Cost</div>
                                <div className="font-semibold text-sm">{card.data?.cost || 0} ⚡</div>
                              </div>
                            </div>

                            {/* Card Text */}
                            <div className="mb-3">
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {card.data?.text || 'No description available'}
                              </p>
                            </div>

                            {/* Card Footer */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Clock size={12} />
                                <span>Phase {card.data?.phase}</span>
                              </div>
                              
                              {!canAfford && (
                                <span className="text-xs text-red-600 font-medium">
                                  Need {(card.data?.cost || 0) - (myPlayer?.energy || 0)} more energy
                                </span>
                              )}
                            </div>

                            {/* Selection indicator */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                                <CheckCircle size={16} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Unplayable Cards */}
                {unplayableCards.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center">
                      <AlertCircle size={20} className="mr-2" />
                      Cannot Play This Phase ({unplayableCards.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {unplayableCards.map((card: any) => {
                        const IconComponent = getCommanderIcon(card.cardType);
                        const wrongPhase = (card.cardPhase) !== 0;
                        const tooExpensive = (card.cardCost || 0) > (myPlayer?.energy || 0);
                        const missingCommander = !canPlayCard(card);

                        return (
                          <div
                            key={card.id}
                            className="relative border-2 border-gray-300 rounded-xl p-4 bg-gray-100 opacity-60"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <div className={`p-2 rounded-full ${getCommanderColor(card.cardType)} text-white opacity-75`}>
                                  <IconComponent size={16} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-gray-600">{card.cardTitle || card.name}</h4>
                                  <p className="text-xs text-gray-400 capitalize">{card.cardType}</p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-xs text-gray-400">Cost</div>
                                <div className="font-semibold text-sm text-gray-600">{card.cardCost || 0} ⚡</div>
                              </div>
                            </div>

                            <div className="mb-3">
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {card.cardText || 'No description available'}
                              </p>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1 text-xs text-gray-400">
                                <Clock size={12} />
                                <span>Phase {card.cardPhase}</span>
                              </div>
                              
                              <span className="text-xs text-red-500 font-medium">
                                {wrongPhase ? `Wrong phase (Phase ${card.cardPhase} card)` : 
                                 tooExpensive ? 'Too expensive' : 
                                 missingCommander ? 'Missing required commander' : 'Cannot play'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="w-80 border-l bg-gray-50/80 flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-800">Actions</h3>
            <p className="text-xs text-gray-600 mt-1">
              Select a card to play or skip this phase
            </p>
          </div>

          <div className="flex-1 p-4">
            {selectedCardId ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Selected Card</h4>
                  {(() => {
                    const selectedCard = playableCards.find((c: any) => c.id === selectedCardId);
                    if (!selectedCard) return null;
                    
                    return (
                      <div className="space-y-2">
                        <div className="font-medium text-sm">{selectedCard.cardTitle || selectedCard.name}</div>
                        <div className="text-xs text-gray-600">{selectedCard.cardText}</div>
                        <div className="text-xs text-green-700">
                          Cost: {selectedCard.cardCost || 0} Energy
                        </div>
                        {cardRequiresTargets(selectedCard) && (
                          <div className="text-xs text-blue-700">
                            ⚠️ Requires {getRequiredTargetCount(selectedCard)} target(s)
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Target Selection */}
                {showTargetSelection && selectedCardId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-3">Select Targets</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {getPotentialTargets(playableCards.find((c: any) => c.id === selectedCardId)).map((target: any) => (
                        <label key={target.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTargets.includes(target.id)}
                            onChange={() => handleTargetToggle(target.id)}
                            className="rounded"
                          />
                          <span className="text-sm">
                            {target.type === 'territory' ? '🏢' : '👤'} {target.name}
                            {target.type === 'territory' && target.ownerId && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({gameState.players.find((p: any) => p.id === target.ownerId)?.name || 'Unknown'})
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                    {selectedTargets.length > 0 && (
                      <div className="mt-2 text-xs text-blue-600">
                        Selected: {selectedTargets.length} target(s)
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handlePlaySelectedCard}
                  disabled={isProcessing}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                    isProcessing
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  <Play size={16} />
                  <span>{isProcessing ? 'Playing...' : 'Play This Card'}</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Play size={32} className="text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Select a card to play</p>
                <p className="text-gray-400 text-xs mt-1">or skip to next phase</p>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="p-4 border-t bg-white/80">
            <div className="space-y-3">
              <div className="text-xs text-gray-600 text-center">
                Phase 4 of 6 • {playableCards.length} cards available
              </div>
              
              <button
                onClick={handleSkip}
                disabled={isProcessing}
                className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                  isProcessing 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <span>{isProcessing ? 'Processing...' : 'Skip - Play No Cards'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayCardsOverlay;