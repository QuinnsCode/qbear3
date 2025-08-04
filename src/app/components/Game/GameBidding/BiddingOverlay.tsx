// /app/components/Game/GameBidding/BiddingOverlay.tsx
'use client'

import React, { useState } from 'react';
import { 
  DollarSign,
  Timer,
  Eye,
  Dice6,
  Trophy,
  Sword,
  X,
  Menu
} from 'lucide-react';
import type { GameState, Player } from '@/app/lib/GameState';

interface BiddingOverlayProps {
  gameState: GameState
  currentUserId: string
  onSubmitBid: (amount: number) => Promise<void>
  onStartYearTurns: () => Promise<void>
  onClose?: () => void
}

const BiddingOverlay = ({ 
  gameState, 
  currentUserId, 
  onSubmitBid, 
  onStartYearTurns,
  onClose 
}: BiddingOverlayProps) => {
  const [bidAmount, setBidAmount] = useState(0);
  const [showBidConfirm, setShowBidConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Helper functions
  const getBiddingActivePlayers = (): Player[] => {
    return gameState.players.filter(player => 
      !player.name.includes('NPC') && player.name !== 'NPC'
    )
  }

  const getBiddingPhaseDisplay = (): string => {
    if (!gameState.bidding) return ''
    
    const { bidsSubmitted, bidsRevealed, playersWaitingToBid } = gameState.bidding
    
    if (!bidsRevealed) {
      const waitingCount = playersWaitingToBid?.length || 0
      if (waitingCount === 0) {
        return 'All bids submitted! Revealing...'
      }
      return `Waiting for ${waitingCount} player${waitingCount > 1 ? 's' : ''} to bid`
    }
    
    return 'Bids revealed! Determining turn order...'
  }

  const getPlayerBidStatus = (playerId: string): 'waiting' | 'submitted' | 'revealed' => {
    if (!gameState.bidding) return 'waiting'
    
    const { bidsSubmitted, bidsRevealed } = gameState.bidding
    const hasBid = playerId in bidsSubmitted
    
    if (!hasBid) return 'waiting'
    if (!bidsRevealed) return 'submitted'
    return 'revealed'
  }

  const myPlayer = gameState.players.find(p => p.id === currentUserId)
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === currentUserId
  const isAITurn = currentPlayer?.name === 'AI Player'

  const handleSubmitBid = async () => {
    if (!myPlayer || bidAmount < 0 || bidAmount > myPlayer.energy) {
      alert('Invalid bid amount!')
      return
    }
    
    setIsSubmitting(true)
    try {
      await onSubmitBid(bidAmount)
      setShowBidConfirm(false)
      setBidAmount(0)
    } catch (error) {
      console.error('Failed to submit bid:', error)
      alert('Failed to submit bid!')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartTurns = async () => {
    try {
      await onStartYearTurns()
    } catch (error) {
      console.error('Failed to start turns:', error)
      alert('Failed to start turns!')
    }
  }

  if (gameState.status !== 'bidding' || !gameState.bidding) {
    return null
  }

  return (
    <>
      {/* Main Bidding Overlay - with minimize support */}
      <div className={`absolute inset-0 transition-all duration-300 z-40 flex items-center justify-center ${
        isMinimized ? 'bg-black/10 backdrop-blur-none pointer-events-none' : 'bg-black/70 backdrop-blur-sm'
      }`}>
        
        {/* Minimized State - Floating Button */}
        {isMinimized && (
          <div className="absolute top-20 right-4 pointer-events-auto">
            <button
              onClick={() => setIsMinimized(false)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-full shadow-lg transition-colors"
              title="Restore bidding overlay"
            >
              <Trophy size={24} />
            </button>
          </div>
        )}
        
        {/* Full Overlay */}
        <div className={`bg-white/95 backdrop-blur-lg rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl transition-all duration-300 ${
          isMinimized ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 pointer-events-auto scale-100'
        }`}>
          
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="text-yellow-500" size={28} />
              <h2 className="text-2xl font-bold text-gray-800">Year {gameState.bidding.year} Bidding</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Minimize (access settings)"
                >
                  <Menu size={20} />
                </button>
                {onClose && (
                  <button 
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {getBiddingPhaseDisplay()}
            </p>
          </div>

          {/* Year Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Game Progress</span>
              <span className="text-xs text-gray-500">Year {gameState.bidding.year}/5</span>
            </div>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map(year => (
                <div 
                  key={year}
                  className={`flex-1 h-2 rounded-full transition-colors duration-300 ${
                    year < gameState.bidding!.year ? 'bg-green-500' :
                    year === gameState.bidding!.year ? 'bg-yellow-500' :
                    'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Players Bidding Status */}
          <div className="mb-6 space-y-3">
            {getBiddingActivePlayers().map(player => {
              const bidStatus = getPlayerBidStatus(player.id)
              const isMe = player.id === currentUserId
              const bidAmount = gameState.bidding!.bidsSubmitted[player.id]
              
              return (
                <div 
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                    isMe ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 transition-colors duration-200 ${
                      bidStatus === 'waiting' ? 'bg-gray-400 animate-pulse' :
                      bidStatus === 'submitted' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                    <div>
                      <span className={`font-medium ${isMe ? 'text-blue-700' : 'text-gray-700'}`}>
                        {player.name} {isMe && '(You)'}
                      </span>
                      <div className="text-xs text-gray-500">
                        Energy: {player.energy}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {bidStatus === 'waiting' && (
                      <div className="flex items-center text-gray-400">
                        <Timer size={16} className="mr-1" />
                        <span className="text-sm">Waiting...</span>
                      </div>
                    )}
                    {bidStatus === 'submitted' && (
                      <div className="flex items-center text-yellow-600">
                        <Eye size={16} className="mr-1" />
                        <span className="text-sm">Bid Ready</span>
                      </div>
                    )}
                    {bidStatus === 'revealed' && bidAmount !== undefined && (
                      <div className="flex items-center text-green-600">
                        <DollarSign size={16} className="mr-1" />
                        <span className="font-bold text-lg">{bidAmount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bidding Interface */}
          {isMyTurn && !myPlayer?.currentBid && !gameState.bidding.bidsRevealed && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Bid (Energy Available: {myPlayer?.energy || 0})
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max={myPlayer?.energy || 0}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(bidAmount / (myPlayer?.energy || 1)) * 100}%, #e5e7eb ${(bidAmount / (myPlayer?.energy || 1)) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="min-w-[60px] text-center">
                    <span className="text-lg font-bold text-blue-600">{bidAmount}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Remaining energy after bid: {(myPlayer?.energy || 0) - bidAmount}
                </div>
              </div>

              <button
                onClick={() => setShowBidConfirm(true)}
                disabled={bidAmount < 0 || bidAmount > (myPlayer?.energy || 0) || isSubmitting}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  (bidAmount >= 0 && bidAmount <= (myPlayer?.energy || 0) && !isSubmitting)
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <DollarSign className="inline mr-2" size={20} />
                {isSubmitting ? 'Submitting...' : `Submit Bid: ${bidAmount} Energy`}
              </button>
            </div>
          )}

          {/* Bid Results */}
          {gameState.bidding.bidsRevealed && (
            <div className="space-y-4">
              {gameState.bidding.highestBidder && (
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Trophy className="mx-auto text-yellow-500 mb-2" size={32} />
                  <div className="font-bold text-lg text-gray-800">
                    {gameState.players.find(p => p.id === gameState.bidding?.highestBidder)?.name} Wins!
                  </div>
                  <div className="text-sm text-gray-600">
                    Goes first this year
                  </div>
                </div>
              )}

              {gameState.bidding.tiebreakRoll && (
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Dice6 className="mx-auto text-blue-500 mb-2" size={32} />
                  <div className="font-bold text-lg text-gray-800 mb-2">Tiebreaker!</div>
                  <div className="space-y-1">
                    {Object.entries(gameState.bidding.tiebreakRoll).map(([playerId, roll]) => (
                      <div key={playerId} className="text-sm">
                        {gameState.players.find(p => p.id === playerId)?.name}: 🎲 {roll}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleStartTurns}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <Sword className="inline mr-2" size={20} />
                Start Year {gameState.bidding.year} Turns
              </button>
            </div>
          )}

          {/* AI Status */}
          {isAITurn && !gameState.bidding.bidsRevealed && (
            <div className="text-center text-gray-500 text-sm mt-4">
              <div className="animate-pulse">🤖 AI is considering their bid...</div>
            </div>
          )}
        </div>
      </div>

      {/* Bid Confirmation Modal */}
      {showBidConfirm && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Your Bid</h3>
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-blue-600 mb-2">{bidAmount}</div>
              <div className="text-sm text-gray-600">Energy Points</div>
              <div className="text-xs text-gray-500 mt-2">
                Remaining after bid: {(myPlayer?.energy || 0) - bidAmount}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBidConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitBid}
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default BiddingOverlay