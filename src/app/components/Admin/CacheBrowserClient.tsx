'use client';

import { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, CheckCircle, Image as ImageIcon, Edit2, Database, Sparkles } from 'lucide-react';
import { searchCachedCards, refreshCardData, updateCardImage, getBrokenImageCards, getCacheStats } from '@/app/serverActions/cardData/cacheManagement';
import { seedBasicLands, diagnosticCacheCheck } from '@/app/serverActions/cardData/seedBasicLands';
import type { CardData } from '@/app/services/cardData/types';

interface CachedCard {
  id: string;
  name: string;
  imageUrl?: string;
  hasValidImage: boolean;
  lastUpdated?: number;
  cardData?: CardData;
}

type ViewMode = 'search' | 'broken' | 'stats';

export function CacheBrowserClient() {
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [cards, setCards] = useState<CachedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CachedCard | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [stats, setStats] = useState<any>(null);

  // Load cache stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const result = await getCacheStats();
    if (result.success) {
      setStats(result.stats);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    const result = await searchCachedCards(searchQuery, 100);
    if (result.success) {
      setCards(result.cards);
    }
    setLoading(false);
  };

  const handleLoadBrokenCards = async () => {
    setLoading(true);
    setViewMode('broken');
    const result = await getBrokenImageCards(100);
    if (result.success) {
      setCards(result.cards.map(c => ({
        ...c,
        hasValidImage: false
      })));
    }
    setLoading(false);
  };

  const handleRefreshCard = async (cardId: string) => {
    setLoading(true);
    const result = await refreshCardData(cardId);
    if (result.success) {
      // Refresh the card list
      await handleSearch();
      alert(`✅ Refreshed card data for ${result.cardData?.name}`);
    } else {
      alert(`❌ Failed to refresh: ${result.error}`);
    }
    setLoading(false);
  };

  const handleUpdateImage = async () => {
    if (!selectedCard || !customImageUrl) return;

    setLoading(true);
    const result = await updateCardImage(selectedCard.id, customImageUrl);
    if (result.success) {
      await handleSearch();
      setSelectedCard(null);
      setCustomImageUrl('');
      alert(`✅ Updated image for ${result.cardData?.name}`);
    } else {
      alert(`❌ Failed to update: ${result.error}`);
    }
    setLoading(false);
  };

  const handleDiagnostic = async () => {
    setLoading(true);
    const result = await diagnosticCacheCheck();
    if (result.success) {
      const details = [
        `Status: ${result.accessible ? '✅ Accessible' : '❌ Not accessible'}`,
        `Total Keys: ${result.totalKeys || 0}`,
        `Sample Keys: ${result.sampleKeys?.map(k => k.name).join(', ') || 'None'}`,
        ``,
        result.message
      ].join('\n');
      alert(details);
    } else {
      alert(`❌ Diagnostic failed: ${result.error}`);
    }
    await loadStats();
    setLoading(false);
  };

  const handleSeedBasicLands = async () => {
    if (!confirm('This will fetch and cache the 5 basic lands (Plains, Island, Swamp, Mountain, Forest) from Scryfall. Continue?')) {
      return;
    }

    setLoading(true);
    const result = await seedBasicLands();
    if (result.success) {
      const summary = result.results
        .map(r => r.cached ? `✅ ${r.name}` : `❌ ${r.name}: ${r.error}`)
        .join('\n');
      alert(`${result.message}\n\n${summary}`);
      await loadStats();
      await handleSearch(); // Refresh the list
    } else {
      alert(`❌ Failed to seed: ${result.error}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Card Cache Browser</h1>
          <p className="text-gray-400">Search, view, and fix card data and images</p>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="bg-slate-800 rounded-lg p-4 mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-gray-400">Total Keys</div>
              <div className="text-2xl font-bold">{stats.totalKeys}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Card Data</div>
              <div className="text-2xl font-bold">{stats.breakdown.cardData}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Name Mappings</div>
              <div className="text-2xl font-bold">{stats.breakdown.cardNameMappings}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Search Cache</div>
              <div className="text-2xl font-bold">{stats.breakdown.searchResults}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Autocomplete</div>
              <div className="text-2xl font-bold">{stats.breakdown.autocomplete}</div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search cards by name..."
                className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>

            {/* Quick Actions */}
            <button
              onClick={handleLoadBrokenCards}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <AlertCircle className="w-4 h-4" />
              Show Broken
            </button>
          </div>

          {/* Diagnostic & Seed Actions */}
          <div className="flex gap-2 pt-4 border-t border-slate-700">
            <button
              onClick={handleDiagnostic}
              disabled={loading}
              className="bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              Run Diagnostic
            </button>
            <button
              onClick={handleSeedBasicLands}
              disabled={loading}
              className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Seed Basic Lands
            </button>
          </div>

          {loading && (
            <div className="text-center text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
              Loading...
            </div>
          )}
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`bg-slate-800 rounded-lg p-4 border-2 ${
                card.hasValidImage ? 'border-slate-600' : 'border-orange-500'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Card Image */}
                <div className="w-24 h-32 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-500" />
                  )}
                </div>

                {/* Card Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg mb-1 truncate">{card.name}</h3>
                  <div className="text-xs text-gray-400 mb-2">
                    ID: {card.id.slice(0, 8)}...
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-3">
                    {card.hasValidImage ? (
                      <div className="flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Valid
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-orange-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        Broken
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRefreshCard(card.id)}
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCard(card);
                        setCustomImageUrl(card.imageUrl || '');
                      }}
                      disabled={loading}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {cards.length === 0 && !loading && (
          <div className="text-center text-gray-400 py-12">
            <p>No cards found. Try searching or viewing broken images.</p>
          </div>
        )}

        {/* Edit Modal */}
        {selectedCard && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full">
              <h2 className="text-2xl font-bold mb-4">Edit Card Image: {selectedCard.name}</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Image URL</label>
                <input
                  type="text"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {customImageUrl && (
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Preview:</div>
                  <img
                    src={customImageUrl}
                    alt="Preview"
                    className="max-w-xs rounded-lg"
                    onError={() => alert('Invalid image URL')}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleUpdateImage}
                  disabled={loading || !customImageUrl}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  Update Image
                </button>
                <button
                  onClick={() => {
                    setSelectedCard(null);
                    setCustomImageUrl('');
                  }}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
