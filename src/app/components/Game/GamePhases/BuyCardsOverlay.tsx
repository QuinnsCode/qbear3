// app/components/Game/GamePhases/BuyCardsOverlay.tsx
'use client'

import { useState, useMemo } from 'react';
import { 
  X,
  Coins,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  ShoppingCart,
  Plus,
  Minus,
  Eye,
  User,
  Mountain,
  Ship,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CommanderDeck {
  type: 'land' | 'diplomat' | 'naval' | 'nuclear';
  name: string;
  icon: any;
  color: string;
  remainingCards: number;
  costPerCard: number;
  description: string;
}

interface BuyCardsOverlayProps {
  gameState: any;
  currentUserId: string;
  onPurchaseCards: (selectedCards: Array<{ commanderType: string; quantity: number }>) => Promise<void>;
  onAdvanceToNextPhase: () => Promise<void>;
}

const BuyCardsOverlay = ({ 
  gameState, 
  currentUserId,
  onPurchaseCards,
  onAdvanceToNextPhase
}: BuyCardsOverlayProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [isMinimized, setIsMinimized] = useState(false);

  const myPlayer = gameState.players.find((p: any) => p.id === currentUserId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === currentUserId;

  // Get player's owned commanders
  const getOwnedCommanders = (): string[] => {
    if (!myPlayer) return [];
    const owned: string[] = [];
    
    myPlayer.territories.forEach((tId: string) => {
      const territory = gameState.territories[tId];
      if (territory?.landCommander === currentUserId) owned.push('land');
      if (territory?.diplomatCommander === currentUserId) owned.push('diplomat');
      if (territory?.navalCommander === currentUserId) owned.push('naval');
      if (territory?.nuclearCommander === currentUserId) owned.push('nuclear');
    });
    
    return owned;
  };

  const ownedCommanders = getOwnedCommanders();

  // Define commander decks with their properties
  const commanderDecks: CommanderDeck[] = [
    {
      type: 'land',
      name: 'Land Commander',
      icon: Mountain,
      color: 'bg-amber-500',
      remainingCards: gameState.cardDecks?.land?.length || 12,
      costPerCard: 1,
      description: 'Territory control and movement cards'
    },
    {
      type: 'diplomat',
      name: 'Diplomat',
      icon: User,
      color: 'bg-blue-500',
      remainingCards: gameState.cardDecks?.diplomat?.length || 12,
      costPerCard: 1,
      description: 'Negotiation and alliance cards'
    },
    {
      type: 'naval',
      name: 'Naval Commander',
      icon: Ship,
      color: 'bg-cyan-500',
      remainingCards: gameState.cardDecks?.naval?.length || 12,
      costPerCard: 1,
      description: 'Water territory and fleet cards'
    },
    {
      type: 'nuclear',
      name: 'Nuclear Commander',
      icon: Zap,
      color: 'bg-red-500',
      remainingCards: gameState.cardDecks?.nuclear?.length || 12,
      costPerCard: 1,
      description: 'Devastating attack cards'
    }
  ];

  // Cart calculations
  const cartTotal = useMemo(() => {
    return Array.from(cart.entries()).reduce((total, [commanderType, quantity]) => {
      const deck = commanderDecks.find(d => d.type === commanderType);
      return total + (deck ? deck.costPerCard * quantity : 0);
    }, 0);
  }, [cart, commanderDecks]);

  const cartItemCount = useMemo(() => {
    return Array.from(cart.values()).reduce((total, quantity) => total + quantity, 0);
  }, [cart]);

  const canAffordCart = (myPlayer?.energy || 0) >= cartTotal;

  // Cart management
  const addToCart = (commanderType: string) => {
    const deck = commanderDecks.find(d => d.type === commanderType);
    if (!deck || !ownedCommanders.includes(commanderType)) return;
    
    const currentInCart = cart.get(commanderType) || 0;
    if (currentInCart < deck.remainingCards) {
      const newCart = new Map(cart);
      newCart.set(commanderType, currentInCart + 1);
      setCart(newCart);
    }
  };

  const removeFromCart = (commanderType: string) => {
    const currentInCart = cart.get(commanderType) || 0;
    if (currentInCart > 0) {
      const newCart = new Map(cart);
      if (currentInCart === 1) {
        newCart.delete(commanderType);
      } else {
        newCart.set(commanderType, currentInCart - 1);
      }
      setCart(newCart);
    }
  };

  const clearCart = () => {
    setCart(new Map());
  };

  // Actions
  const handlePurchase = async () => {
    if (!canAffordCart || cartItemCount === 0 || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const selectedCards = Array.from(cart.entries()).map(([commanderType, quantity]) => ({
        commanderType,
        quantity
      }));
      
      await onPurchaseCards(selectedCards);
      setCart(new Map()); // Clear cart after successful purchase
    } catch (error) {
      console.error('Card purchase failed:', error);
      alert(`Failed to purchase cards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
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

  if (gameState.status !== 'playing' || gameState.currentPhase !== 3) {
    return null;
  }

  if (!isMyTurn) {
    return (
      <div className="absolute top-14 left-0 right-0 bg-purple-500/90 backdrop-blur-sm text-white p-3 z-40 shadow-lg">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <ShoppingCart size={20} />
            <span className="font-medium">Buy Cards Phase</span>
          </div>
          <div className="text-sm opacity-90 mt-1">
            Waiting for {currentPlayer?.name} to buy cards...
          </div>
        </div>
      </div>
    );
  }

  // ✅ IMPROVED: Better minimized state with more info and cart summary
  if (isMinimized) {
    return (
      <div className="absolute top-16 left-4 right-4 bg-purple-600/95 backdrop-blur-md text-white px-4 py-3 rounded-lg z-50 shadow-xl border border-purple-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShoppingCart size={18} />
            <div>
              <div className="font-semibold">Buy Cards Phase</div>
              <div className="text-xs opacity-90">
                {cartItemCount > 0 ? `${cartItemCount} cards in cart (${cartTotal} energy)` : 'Cart empty'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-sm bg-yellow-500/20 px-2 py-1 rounded">
              {myPlayer?.energy || 0} ⚡
            </div>
            
            {/* Quick action buttons when minimized */}
            {cartItemCount > 0 && (
              <button
                onClick={handlePurchase}
                disabled={!canAffordCart || isProcessing}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 px-3 py-1 rounded text-xs font-medium transition-colors"
              >
                Buy ({cartTotal} ⚡)
              </button>
            )}
            
            <button
              onClick={handleSkip}
              disabled={isProcessing}
              className="bg-gray-500 hover:bg-gray-600 px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              Skip
            </button>
            
            <button
              onClick={() => setIsMinimized(false)}
              className="text-white hover:text-purple-200 transition-colors"
              title="Expand Buy Cards"
            >
              <ChevronDown size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    // ✅ FIXED: Removed the backdrop overlay so you can see the map behind
    <div className="absolute top-20 left-0 right-0 bottom-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-white/98 backdrop-blur-lg rounded-2xl w-full max-w-5xl max-h-[85vh] flex shadow-2xl mx-4 pointer-events-auto border border-gray-200">
        
        {/* Main Decks Section */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="text-purple-500" size={28} />
                <h2 className="text-2xl font-bold text-gray-800">Buy Cards</h2>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-1 rounded-lg">
                  <Coins className="text-yellow-600" size={16} />
                  <span className="font-semibold text-yellow-800">{myPlayer?.energy || 0} Energy</span>
                </div>
                
                {/* ✅ ADD: Minimize button in header */}
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
              💡 <strong>How it works:</strong> Click commander decks to add random cards to your cart. 
              You can only buy cards for commanders you control on the map. Use minimize button to see the map.
            </div>
          </div>

          {/* Commander Decks Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {ownedCommanders.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Commanders Available</h3>
                <p className="text-gray-500">
                  You need to control commanders on the map to buy their cards
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {commanderDecks.map((deck) => {
                  const isOwned = ownedCommanders.includes(deck.type);
                  const inCart = cart.get(deck.type) || 0;
                  const canAfford = (myPlayer?.energy || 0) >= deck.costPerCard;
                  const canBuy = isOwned && canAfford && deck.remainingCards > inCart;
                  const IconComponent = deck.icon;

                  return (
                    <div key={deck.type} 
                         className={`relative border-2 rounded-xl p-6 transition-all duration-200 ${
                           isOwned 
                             ? canBuy 
                               ? 'border-green-300 bg-white hover:shadow-lg cursor-pointer hover:scale-105' 
                               : 'border-gray-300 bg-gray-50'
                             : 'border-gray-200 bg-gray-100 opacity-60'
                         }`}
                         onClick={canBuy ? () => addToCart(deck.type) : undefined}
                    >
                      {/* Deck Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 rounded-full ${deck.color} text-white`}>
                            <IconComponent size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800">{deck.name}</h3>
                            <p className="text-sm text-gray-600">{deck.description}</p>
                          </div>
                        </div>
                        
                        {/* Ownership indicator */}
                        <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          isOwned ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isOwned ? '✓ Owned' : '✗ Not Owned'}
                        </div>
                      </div>

                      {/* Deck Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Cards Remaining:</span>
                          <span className="font-semibold">{deck.remainingCards - inCart}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Cost per Card:</span>
                          <span className="font-semibold">{deck.costPerCard} Energy</span>
                        </div>
                        {inCart > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600">In Cart:</span>
                            <span className="font-semibold text-green-600">{inCart}</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {isOwned && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {inCart > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromCart(deck.type);
                                }}
                                className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                              >
                                <Minus size={14} />
                              </button>
                            )}
                            {inCart > 0 && (
                              <span className="font-medium text-gray-700">{inCart}</span>
                            )}
                            {canBuy && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(deck.type);
                                }}
                                className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
                              >
                                <Plus size={14} />
                              </button>
                            )}
                          </div>
                          
                          {!canAfford && (
                            <span className="text-xs text-red-600">Not enough energy</span>
                          )}
                        </div>
                      )}

                      {/* Disabled overlay */}
                      {!isOwned && (
                        <div className="absolute inset-0 bg-gray-500/20 rounded-xl flex items-center justify-center">
                          <span className="text-gray-600 font-medium">Commander Required</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Shopping Cart Sidebar */}
        <div className="w-80 border-l bg-gray-50/80 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Cart</h3>
              <div className="flex items-center space-x-2">
                <ShoppingCart size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-600">{cartItemCount} cards</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.size === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart size={32} className="text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Cart is empty</p>
                <p className="text-gray-400 text-xs mt-1">Click commander decks to add cards</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from(cart.entries()).map(([commanderType, quantity]) => {
                  const deck = commanderDecks.find(d => d.type === commanderType);
                  if (!deck) return null;
                  
                  return (
                    <div key={commanderType} className="bg-white/80 rounded-lg p-3 border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{deck.name}</span>
                        <button
                          onClick={() => {
                            const newCart = new Map(cart);
                            newCart.delete(commanderType);
                            setCart(newCart);
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span>{quantity} random cards</span>
                        <span>{deck.costPerCard} × {quantity} = {deck.costPerCard * quantity} energy</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => removeFromCart(commanderType)}
                          className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs flex items-center justify-center"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-medium w-8 text-center">{quantity}</span>
                        <button
                          onClick={() => addToCart(commanderType)}
                          className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs flex items-center justify-center"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Summary & Actions */}
          <div className="p-4 border-t bg-white/80">
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Total Cost:</span>
                <span className="font-semibold">{cartTotal} Energy</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Remaining:</span>
                <span className={`font-semibold ${canAffordCart ? 'text-green-600' : 'text-red-600'}`}>
                  {(myPlayer?.energy || 0) - cartTotal} Energy
                </span>
              </div>
            </div>

            {cart.size > 0 && (
              <button
                onClick={clearCart}
                className="w-full text-xs text-gray-600 hover:text-gray-800 mb-3"
              >
                Clear Cart
              </button>
            )}

            <div className="space-y-2">
              <button
                onClick={handlePurchase}
                disabled={isProcessing || !canAffordCart || cartItemCount === 0}
                className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                  isProcessing || !canAffordCart || cartItemCount === 0
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <CheckCircle size={16} />
                <span>{isProcessing ? 'Purchasing...' : `Buy ${cartItemCount} Cards`}</span>
              </button>
              
              <button
                onClick={handleSkip}
                disabled={isProcessing}
                className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                  isProcessing 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <span>{isProcessing ? 'Processing...' : 'Skip - Buy Nothing'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyCardsOverlay;