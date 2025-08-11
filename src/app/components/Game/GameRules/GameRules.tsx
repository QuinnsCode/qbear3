// app/components/Game/GameRules.tsx
import { 
  X,
  Info,
  Coins
} from 'lucide-react';

interface GameRulesProps {
  gameState: any
  currentUserId: string
  onClose?: () => void
}

export default function GameRules({ gameState, currentUserId, onClose }: GameRulesProps) {
  const myPlayer = gameState?.players?.find((p: any) => p.id === currentUserId);

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-60 flex items-center justify-center pt-16">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Info className="text-blue-500" size={28} />
            <h1 className="text-2xl font-bold text-gray-800">Game Rules</h1>
          </div>
          <div className="flex items-center space-x-4">
            {myPlayer && (
              <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-1 rounded-lg">
                <Coins className="text-yellow-600" size={16} />
                <span className="font-semibold text-yellow-800">{myPlayer.energy || 0} Energy</span>
              </div>
            )}
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

        {/* Rules Content */}
        <div className="space-y-6">
          
          {/* Setup Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Setup</h2>
          </div>

          {/* Start Game Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Start Game</h2>
          </div>

          {/* Game End Condition */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">Victory Condition</h2>
            <p className="text-blue-700">Continue until end of last player in year 5 OR someone conquers all territories</p>
          </div>

          {/* Year Phases */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Year Phases</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Each player places 3 units per turn on their territories</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Each player builds and hires commanders and builds</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Each player buys command cards with energy</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Each player plays command cards</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Each player invades territories</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Each player fortifies positions</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Next player's turn begins</span>
              </li>
            </ul>
          </div>

          {/* Current Game Setup */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <h2 className="text-lg font-semibold text-amber-800 mb-3">Current Game Setup</h2>
            <ul className="space-y-2 text-amber-700">
              <li className="flex items-start space-x-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>The only game mode for now is Human vs. AI vs. NPC</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>We do not have Space commander and the moon quite setup yet.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>No continuous attacking through many enemy territories with the same force. We call it marauding. This is where you can continue attacking through many territories per turn.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>The start of our game is randomized vs traditional being back and forth player chosen then placed on.</span>
              </li>
            </ul>
          </div>

          {/* Place Units */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Place Units</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="text-gray-500 mt-1">•</span>
                <span>We randomly select 4 territories to nuke. These are removed from play and so are their connections.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-gray-500 mt-1">•</span>
                <span>Randomly pass out territories to human, AI, and NPC. NPC gets 2 per territory while human and AI get 1 per.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-gray-500 mt-1">•</span>
                <span>Human and AI then go back and forth placing 3 units on any territory they control one at a time.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-gray-500 mt-1">•</span>
                <span>With this 3 player setup, we have 35 units to place.</span>
              </li>
            </ul>
          </div>

          {/* Place Commanders and Base */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h2 className="text-lg font-semibold text-purple-800 mb-3">Place Commanders and Base</h2>
            <ul className="space-y-2 text-purple-700">
              <li className="flex items-start space-x-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>We are going to back and forth with AI to place our Land Commander.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-500 mt-1">•</span>
                <span className="line-through">NOTE: Commanders all attack from or to their territory type as a d8 roll.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Then we are going to back and forth with AI to place our Land Commander.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Then we place our Diplomat Commander.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Then we place our Space Base.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>A space base has many benefits. Units on a territory with one defend with d8. They allow you to go to Lunar territories, and at the start of turns you will get a unit on each territory that has a space base.</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}