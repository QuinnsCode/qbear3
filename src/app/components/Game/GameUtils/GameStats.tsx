// app/components/Game/GameStats.tsx
'use client'

import { Clock } from 'lucide-react';

export const GameStats = ({ gameState, currentUserId }) => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const playerStats = gameState.players.map(player => ({
    ...player,
    territories: Object.values(gameState.territories).filter(t => t.ownerId === player.id).length,
    units: Object.values(gameState.territories)
      .filter(t => t.ownerId === player.id)
      .reduce((sum, t) => sum + t.machineCount, 0)
  }));

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">Game Status</h3>
        <div className="flex items-center space-x-2">
          <Clock size={16} className="text-gray-500" />
          <span className="text-sm text-gray-600">Turn {gameState.currentPlayerIndex + 1}</span>
        </div>
      </div>
      
      <div className="space-y-2">
        {playerStats.map(player => (
          <div 
            key={player.id}
            className={`flex items-center justify-between p-2 rounded ${
              player.id === currentPlayer.id ? 'bg-yellow-100 border border-yellow-300' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full bg-${player.color}-500`}></div>
              <span className="text-sm font-medium">
                {player.name}
                {player.id === currentUserId && ' (You)'}
                {player.id === currentPlayer.id && ' 👑'}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              {player.territories} territories • {player.units} units
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};