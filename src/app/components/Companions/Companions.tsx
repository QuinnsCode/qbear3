"use client";

import { useState } from "react";

interface CompanionsProps {
  gameId: string;
  currentUserId: string;
}

type InviteMode = 'player' | 'observer';

export default function Companions({ gameId, currentUserId }: CompanionsProps) {
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [inviteMode, setInviteMode] = useState<InviteMode>('player');

  // Mock data - replace with real data
  const companions = [
    {
      id: '1',
      username: 'Gandalf_Grey',
      status: 'online',
      activity: 'Playing D&D',
      inThisGame: false
    },
    {
      id: '2', 
      username: 'Elaria_Moon',
      status: 'online',
      activity: 'In this game',
      inThisGame: true,
      role: 'player'
    },
    {
      id: '3',
      username: 'Legolas_Swift', 
      status: 'online',
      activity: 'Browsing games',
      inThisGame: false
    },
    {
      id: '4',
      username: 'Thorin_Battle',
      status: 'offline',
      activity: 'Last seen 2h ago',
      inThisGame: false
    },
    {
      id: '5',
      username: 'Aragorn_Ranger',
      status: 'online',
      activity: 'In this game', 
      inThisGame: true,
      role: 'observer'
    }
  ];

  const onlineCompanions = companions.filter(c => c.status === 'online');
  const offlineCompanions = companions.filter(c => c.status === 'offline');

  const handleInvite = (companionId: string, mode: InviteMode) => {
    console.log(`Inviting ${companionId} as ${mode} to game ${gameId}`);
    // TODO: Implement invite logic
  };

  if (showInvitePanel) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">Invite Companions</h4>
          <button 
            onClick={() => setShowInvitePanel(false)}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Invite Mode Toggle */}
        <div className="mb-4">
          <div className="flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setInviteMode('player')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                inviteMode === 'player'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Add Player
            </button>
            <button
              onClick={() => setInviteMode('observer')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                inviteMode === 'observer'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Add Observer
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-400 mb-4">
          {inviteMode === 'player' 
            ? 'Players can actively participate in the game'
            : 'Observers can watch the game but cannot make moves'
          }
        </div>

        {/* Available Companions */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {onlineCompanions
            .filter(c => !c.inThisGame)
            .map(companion => (
              <div key={companion.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700/50">
                <div className="relative">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {companion.username[0]}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-gray-800 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{companion.username}</div>
                  <div className="text-gray-400 text-xs truncate">{companion.activity}</div>
                </div>
                <button
                  onClick={() => handleInvite(companion.id, inviteMode)}
                  className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                    inviteMode === 'player'
                      ? 'bg-green-600/20 text-green-300 hover:bg-green-600/30'
                      : 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30'
                  }`}
                >
                  Invite
                </button>
              </div>
            ))
          }
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-h-96 overflow-y-auto">
      {/* Online Companions */}
      <div className="mb-4">
        <h4 className="text-green-400 text-sm font-medium mb-3 uppercase tracking-wide">
          Online — {onlineCompanions.length}
        </h4>
        <div className="space-y-2">
          {onlineCompanions.map(companion => (
            <div key={companion.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700/50 transition-colors">
              <div className="relative">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {companion.username[0]}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-gray-800 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium">{companion.username}</div>
                <div className="text-gray-400 text-xs truncate">{companion.activity}</div>
              </div>
              <div className="flex items-center space-x-1">
                {companion.inThisGame ? (
                  <span className={`text-xs px-2 py-1 rounded-lg ${
                    companion.role === 'player' 
                      ? 'bg-green-600/20 text-green-300'
                      : 'bg-blue-600/20 text-blue-300'
                  }`}>
                    {companion.role === 'player' ? 'Playing' : 'Watching'}
                  </span>
                ) : (
                  <button 
                    onClick={() => setShowInvitePanel(true)}
                    className="text-blue-400 hover:text-blue-300 text-sm bg-blue-900/20 px-3 py-1 rounded-lg transition-colors"
                  >
                    Invite
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Offline Companions */}
      {offlineCompanions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wide">
            Offline — {offlineCompanions.length}
          </h4>
          <div className="space-y-2">
            {offlineCompanions.map(companion => (
              <div key={companion.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700/50 transition-colors">
                <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {companion.username[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-300 text-sm font-medium">{companion.username}</div>
                  <div className="text-gray-500 text-xs truncate">{companion.activity}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Companion Button */}
      <div className="pt-4 border-t border-gray-600">
        <button 
          onClick={() => setShowInvitePanel(true)}
          className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          Invite Companions
        </button>
      </div>
    </div>
  );
}