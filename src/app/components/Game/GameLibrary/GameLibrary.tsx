// @/app/components/Game/GameLibrary/GameLibrary.tsx
"use client";

import { useState, useEffect } from 'react';
import {
  FantasyCard,
  FantasyTitle,
  FantasyText,
  FantasyButton
} from "@/app/components/theme/FantasyTheme";
import { Gamepad2, Dice6, Puzzle, Swords } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Game {
  id: string;
  name: string;
  type: 'dice' | 'card' | 'strategy' | 'puzzle' | 'rpg';
  playerCount: {
    current: number;
    max: number;
    min: number;
  };
  status: 'waiting' | 'active' | 'completed';
  createdBy: string;
  createdAt: string;
  lastActivity?: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface GameLibraryProps {
  organizationId?: string;
  userId?: string;
  currentUserName?: string;
  className?: string;
}

// Mock data - you can import this from a separate file later
const MOCK_GAMES: Game[] = [
  {
    id: 'clinical-azure-partridge',
    name: 'Clinical Azure Partridge',
    type: 'strategy',
    playerCount: { current: 1, max: 4, min: 2 },
    status: 'waiting',
    createdBy: 'Ryan',
    createdAt: '2024-01-15T10:30:00Z',
    lastActivity: '2024-01-15T14:22:00Z',
    description: 'Strategic gameplay awaits brave adventurers',
    difficulty: 'medium'
  },
  {
    id: 'dragon-gambit-alpha',
    name: 'Dragon\'s Gambit',
    type: 'strategy',
    playerCount: { current: 2, max: 4, min: 2 },
    status: 'active',
    createdBy: 'Sir Galahad',
    createdAt: '2024-01-15T09:15:00Z',
    lastActivity: '2024-01-15T13:22:00Z',
    description: 'A tactical battle for territorial dominance',
    difficulty: 'medium'
  },
  {
    id: 'mystic-dice-tower',
    name: 'Mystic Dice Tower',
    type: 'dice',
    playerCount: { current: 3, max: 6, min: 2 },
    status: 'active',
    createdBy: 'Wizard Merlin',
    createdAt: '2024-01-14T16:45:00Z',
    lastActivity: '2024-01-15T12:10:00Z',
    description: 'Roll your way to magical victory',
    difficulty: 'easy'
  },
  {
    id: 'enchanted-card-duel',
    name: 'Enchanted Card Duel',
    type: 'card',
    playerCount: { current: 2, max: 2, min: 2 },
    status: 'completed',
    createdBy: 'Sorcerer Zara',
    createdAt: '2024-01-14T11:20:00Z',
    lastActivity: '2024-01-14T12:45:00Z',
    description: 'Head-to-head magical card battle',
    difficulty: 'hard'
  },
  {
    id: 'ancient-rune-puzzle',
    name: 'Ancient Rune Puzzle',
    type: 'puzzle',
    playerCount: { current: 1, max: 3, min: 1 },
    status: 'waiting',
    createdBy: 'Scholar Athena',
    createdAt: '2024-01-13T14:30:00Z',
    description: 'Decipher mystical symbols to unlock secrets',
    difficulty: 'hard'
  },
  {
    id: 'tavern-tales-rpg',
    name: 'Tavern Tales',
    type: 'rpg',
    playerCount: { current: 4, max: 6, min: 3 },
    status: 'active',
    createdBy: 'Bard Melody',
    createdAt: '2024-01-12T19:00:00Z',
    lastActivity: '2024-01-15T11:30:00Z',
    description: 'Collaborative storytelling adventure',
    difficulty: 'medium'
  }
];

export function GameLibrary({ 
  organizationId, 
  userId, 
  currentUserName = 'Ryan', 
  className = '' 
}: GameLibraryProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'active'>('all');

  useEffect(() => {
    // Simulate API call - replace with actual fetch later
    const loadGames = async () => {
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setGames(MOCK_GAMES);
        setLoading(false);
      } catch (err) {
        setError('Failed to load games');
        setLoading(false);
      }
    };

    loadGames();
  }, [organizationId, userId]);

  const getGameIcon = (type: Game['type']): LucideIcon => {
    const icons: Record<Game['type'], LucideIcon> = {
      dice: Dice6,
      card: Gamepad2,
      strategy: Swords,
      puzzle: Puzzle,
      rpg: Swords
    };
    return icons[type] || Gamepad2;
  };

  const getStatusColor = (status: Game['status']) => {
    const colors = {
      waiting: 'text-yellow-600 bg-yellow-100/20 border-yellow-600/30',
      active: 'text-green-600 bg-green-100/20 border-green-600/30',
      completed: 'text-gray-600 bg-gray-100/20 border-gray-600/30'
    };
    return colors[status];
  };

  const getDifficultyColor = (difficulty?: Game['difficulty']) => {
    const colors = {
      easy: 'text-green-700',
      medium: 'text-yellow-700',
      hard: 'text-red-700'
    };
    return difficulty ? colors[difficulty] : 'text-gray-700';
  };

  const myGames = games.filter(game => game.createdBy === currentUserName);
  const allGames = games;

  const handleJoinGame = async (gameId: string) => {
    try {
      if (gameId === 'clinical-azure-partridge') {
        window.location.href = 'https://ryan.qntbr.com/game/clinical-azure-partridge';
        return;
      }
      
      window.location.href = `/game/${gameId}`;
    } catch (err) {
      setError('Failed to join game');
    }
  };

  const handleCreateGame = () => {
    window.location.href = '/game';
  };

  if (loading) {
    return (
      <FantasyCard className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      </FantasyCard>
    );
  }

  if (error) {
    return (
      <FantasyCard className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>Failed to load games: {error}</p>
          <FantasyButton 
            variant="secondary" 
            size="sm" 
            className="mt-4"
            onClick={() => {
              setError(null);
              setLoading(true);
            }}
          >
            Retry
          </FantasyButton>
        </div>
      </FantasyCard>
    );
  }

  const renderGameCard = (game: Game) => {
    const GameIcon = getGameIcon(game.type);
    return (
      <FantasyCard key={game.id} className="p-4 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <GameIcon size={24} className="text-amber-800" />
            <div>
              <h3 className="font-semibold text-amber-900">{game.name}</h3>
              <p className="text-xs text-amber-700 capitalize">{game.type} Game</p>
            </div>
          </div>
        <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(game.status)}`}>
          {game.status}
        </span>
      </div>

      {game.description && (
        <p className="text-sm text-amber-800 mb-3">{game.description}</p>
      )}

      <div className="flex justify-between items-center text-xs text-amber-700 mb-3">
        <span>Players: {game.playerCount.current}/{game.playerCount.max}</span>
        <span>Created by: {game.createdBy}</span>
      </div>

      {game.difficulty && (
        <div className="flex justify-between items-center mb-3">
          <span className={`text-xs font-medium ${getDifficultyColor(game.difficulty)}`}>
            Difficulty: {game.difficulty}
          </span>
          <span className="text-xs text-amber-600">
            {game.lastActivity ? 'Active' : 'Created'}: {new Date(game.lastActivity || game.createdAt).toLocaleDateString()}
          </span>
        </div>
      )}

      <div className="flex space-x-2">
        <FantasyButton
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={() => handleJoinGame(game.id)}
        >
          {game.status === 'waiting' ? 'Join Game' : game.status === 'active' ? 'Continue' : 'View'}
        </FantasyButton>
        {game.createdBy === currentUserName && game.status === 'waiting' && (
          <FantasyButton
            variant="secondary"
            size="sm"
          >
            Settings
          </FantasyButton>
        )}
      </div>
    </FantasyCard>
    );
  };

  return (
    <div className={className}>
      {/* Create New Game Section */}
      <FantasyCard className="p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <FantasyTitle size="md" className="mb-2">Start New Quest</FantasyTitle>
            <FantasyText variant="secondary">
              Create a new game for adventurers to join
            </FantasyText>
          </div>
          <FantasyButton variant="primary" onClick={handleCreateGame}>
            Create Game
          </FantasyButton>
        </div>
      </FantasyCard>

      {/* My Games Section */}
      {myGames.length > 0 && (
        <div className="mb-8">
          <FantasyTitle size="md" className="mb-4">My Quests</FantasyTitle>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myGames.map(renderGameCard)}
          </div>
        </div>
      )}

      {/* All Games Section */}
      <div>
        <FantasyTitle size="md" className="mb-4">All Active Quests</FantasyTitle>
        
        {/* Filter tabs */}
        <div className="flex space-x-2 mb-4">
          {[
            { key: 'all', label: 'All Games' },
            { key: 'available', label: 'Available' },
            { key: 'active', label: 'In Progress' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === tab.key
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allGames
            .filter(game => {
              switch (filter) {
                case 'available':
                  return game.status === 'waiting' && game.playerCount.current < game.playerCount.max;
                case 'active':
                  return game.status === 'active';
                default:
                  return true;
              }
            })
            .map(renderGameCard)}
        </div>

        {allGames.length === 0 && (
          <FantasyCard className="p-8 text-center">
            <FantasyText variant="secondary">
              No games found. Create the first quest for your lair!
            </FantasyText>
          </FantasyCard>
        )}
      </div>
    </div>
  );
}