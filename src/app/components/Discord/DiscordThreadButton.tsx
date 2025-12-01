// app/components/Discord/DiscordThreadButton.tsx
'use client'

import { useState } from "react";

interface DiscordThreadButtonProps {
  gameId: string;
  gameName: string;
  gameType: 'game' | 'cardGame';
  initialThreadUrl: string | null; // Add this - from server
}

export function DiscordThreadButton({ 
  gameId, 
  gameName, 
  gameType,
  initialThreadUrl 
}: DiscordThreadButtonProps) {
  const [threadUrl, setThreadUrl] = useState<string | null>(initialThreadUrl);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No useEffect needed - we already have the data from server!

  const createThread = async () => {
    setCreating(true);
    setError(null);

    try {
      // Call your existing server function to create thread
      const { createThreadForGame } = await import('@/app/serverActions/discord/createThreadForGame');
      const result = await createThreadForGame(gameId, gameName, gameType);

      if (!result.success) {
        if (result.needsConnection) {
          setError('Connect Discord in Sanctum first!');
        } else {
          setError(result.error || 'Failed to create Discord channel');
        }
        return;
      }

      setThreadUrl(result.threadUrl);
    } catch (err) {
      console.error('Failed to create thread:', err);
      setError('Failed to create Discord channel');
    } finally {
      setCreating(false);
    }
  };

  if (threadUrl) {
    return (
      <a 
        href={threadUrl} 
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-12 right-4 z-50 flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg shadow-lg transition-all"
      >
        <span>💬</span>
        <span className="text-sm font-semibold">Discord</span>
      </a>
    );
  }

  return (
    <div className="fixed top-20 right-4 z-50">
      <button
        onClick={createThread}
        disabled={creating}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-semibold transition-all ${
          creating 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-[#5865F2] hover:bg-[#4752C4]'
        }`}
      >
        <span>{creating ? '⏳' : '💬'}</span>
        <span>{creating ? 'Creating...' : 'Create Discord'}</span>
      </button>
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-xs max-w-[200px]">
          {error}
        </div>
      )}
    </div>
  );
}