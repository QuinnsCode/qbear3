'use client'

// app/components/Game/Cards/CardReference.tsx - CLIENT COMPONENT
import React, { useState, useMemo } from 'react';
import { 
  User, Mountain, Ship, Zap, 
  Filter, X, Eye, EyeOff, Search,
  Sword, Shield, Home, ArrowRight,
  ChevronDown, ChevronUp
} from 'lucide-react';
import Card, { GameCard } from './Card';

interface CardReferenceProps {
  allCards: GameCard[];
  uniqueCards: Array<{ card: GameCard; count: number }>;
  ownedCommanders: string[];
  playerEnergy: number;
  onClose?: () => void;
}

export const CardReference: React.FC<CardReferenceProps> = ({ 
  allCards,
  uniqueCards,
  ownedCommanders,
  playerEnergy,
  onClose 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommander, setSelectedCommander] = useState<GameCard['commanderType'] | 'all'>('all');
  const [selectedPhase, setSelectedPhase] = useState<GameCard['cardPhase'] | 'all'>('all');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter cards based on client-side selections and search
  const filteredUniqueCards = useMemo(() => {
    let filtered = uniqueCards;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.card.cardTitle.toLowerCase().includes(query) ||
        item.card.cardText.toLowerCase().includes(query) ||
        item.card.commanderType.toLowerCase().includes(query)
      );
    }

    // Filter by commander type
    if (selectedCommander !== 'all') {
      filtered = filtered.filter(item => item.card.commanderType === selectedCommander);
    }

    // Filter by phase
    if (selectedPhase !== 'all') {
      filtered = filtered.filter(item => item.card.cardPhase === selectedPhase);
    }

    // Filter by availability
    if (showOnlyAvailable) {
      filtered = filtered.filter(item => ownedCommanders.includes(item.card.commanderType));
    }

    return filtered;
  }, [uniqueCards, searchQuery, selectedCommander, selectedPhase, showOnlyAvailable, ownedCommanders]);

  const commanderFilters = [
    { id: 'all' as const, name: 'All', icon: Filter },
    { id: 'diplomat' as const, name: 'Diplomat', icon: User },
    { id: 'naval' as const, name: 'Naval', icon: Ship },
    { id: 'land' as const, name: 'Land', icon: Mountain },
    { id: 'nuclear' as const, name: 'Nuclear', icon: Zap },
  ];

  const phaseFilters = [
    { id: 'all' as const, name: 'All Phases', icon: Filter },
    { id: 0 as const, name: 'Before Invasions', icon: Sword },
    { id: 1 as const, name: 'Opponent Invades', icon: Shield },
    { id: 2 as const, name: 'End Game', icon: Home },
    { id: 3 as const, name: 'End of Turn', icon: ArrowRight },
  ];

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCommander('all');
    setSelectedPhase('all');
    setShowOnlyAvailable(false);
  };

  const hasActiveFilters = searchQuery.trim() || selectedCommander !== 'all' || selectedPhase !== 'all' || showOnlyAvailable;

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-65 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* Header with Search */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Search className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Card Reference</h2>
                <p className="text-sm text-gray-600">{filteredUniqueCards.length} cards found</p>
              </div>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search cards by name, text, or commander type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Filter size={16} />
              <span>Advanced Filters</span>
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {hasActiveFilters && (
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="px-6 py-4 border-b bg-gray-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Commander Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Commander Type</label>
                <div className="flex flex-wrap gap-2">
                  {commanderFilters.map(filter => {
                    const Icon = filter.icon;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedCommander(filter.id)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedCommander === filter.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-blue-50 border'
                        }`}
                      >
                        <Icon size={16} />
                        <span>{filter.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phase Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Play Phase</label>
                <div className="flex flex-wrap gap-2">
                  {phaseFilters.map(filter => {
                    const Icon = filter.icon;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedPhase(filter.id)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedPhase === filter.id
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-green-50 border'
                        }`}
                      >
                        <Icon size={16} />
                        <span>{filter.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="mt-4 flex items-center space-x-3">
              <button
                onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showOnlyAvailable
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showOnlyAvailable ? <Eye size={16} /> : <EyeOff size={16} />}
                <span>Show Only Available</span>
              </button>
              <span className="text-xs text-gray-500">
                {showOnlyAvailable ? 'Hiding cards for commanders you don\'t control' : 'Showing all cards (unavailable at 50% opacity)'}
              </span>
            </div>
          </div>
        )}

        {/* Cards Grid - Now Takes Up Most Space */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredUniqueCards.length === 0 ? (
            <div className="text-center py-16">
              {searchQuery.trim() ? (
                <>
                  <Search size={48} className="text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Cards Found</h3>
                  <p className="text-gray-500 mb-4">No cards match "{searchQuery}"</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <Filter size={48} className="text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Cards Found</h3>
                  <p className="text-gray-500">Try adjusting your filters</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredUniqueCards.map(({ card, count }) => {
                const isOwned = ownedCommanders.includes(card.commanderType);
                const isAvailable = playerEnergy >= card.cardCost;

                return (
                  <div key={`${card.cardTitle}-${card.commanderType}`} className="relative">
                    <Card
                      card={card}
                      isOwned={isOwned}
                      isAvailable={isAvailable}
                    />
                    {count > 1 && (
                      <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                        {count}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardReference;