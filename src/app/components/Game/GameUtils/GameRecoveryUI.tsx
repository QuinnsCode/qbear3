// components/Game/GameRecoveryUI.tsx
import { useGameRecovery } from '@/app/hooks/useGameRecovery';

interface GameRecoveryUIProps {
  gameId: string;
  onRecovered: (gameState: any) => void;
  onGiveUp: () => void;
}

export function GameRecoveryUI({ gameId, onRecovered, onGiveUp }: GameRecoveryUIProps) {
  const {
    attemptRecovery,
    resetRecovery,
    isRecovering,
    recoveryAttempts,
    lastRecoveryError,
    canRetry
  } = useGameRecovery({
    gameId,
    onRecovered,
    onRecoveryFailed: (error) => {
      console.error('Recovery failed:', error);
    }
  });

  return (
    <div className="h-screen w-full bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-6">
        <div className="text-6xl mb-4">🔄</div>
        <h1 className="text-2xl font-bold mb-4">Connection Lost</h1>
        <p className="text-gray-300 mb-6">
          Lost connection to the game server. Attempting to reconnect...
        </p>
        
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-300 mb-2">Game ID: {gameId}</p>
          <p className="text-sm text-gray-300">Attempts: {recoveryAttempts}/3</p>
          {lastRecoveryError && (
            <p className="text-sm text-red-400 mt-2">{lastRecoveryError}</p>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={attemptRecovery}
            disabled={isRecovering || !canRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {isRecovering ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Reconnecting...
              </>
            ) : canRetry ? (
              '🔄 Try Again'
            ) : (
              '❌ Max Attempts Reached'
            )}
          </button>
          
          <button
            onClick={() => {
              resetRecovery();
              window.location.reload();
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            🔃 Refresh Page
          </button>
          
          <button
            onClick={onGiveUp}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            🏠 Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
}