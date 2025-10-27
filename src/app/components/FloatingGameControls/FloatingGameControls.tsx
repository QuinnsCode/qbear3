"use client";

import { useState } from "react";
import Companions from "@/app/components/Companions/Companions";
import { DragonEyeViewerButton } from "@/app/components/DragonEyeViewerButton/DragonEyeViewerButton";

const yourViewerCount = 67;

interface FloatingGameControlsProps {
  gameId: string;
  currentUserId: string;
}

export function FloatingGameControls({ gameId, currentUserId }: FloatingGameControlsProps) {
  const [friendsPanelOpen, setFriendsPanelOpen] = useState(false);
  const [functionsPanelOpen, setFunctionsPanelOpen] = useState(false);

  return (
    <>
      {/* Bottom Left - Friends Button */}
      <div className="absolute bottom-6 left-6 z-30">
        <DragonEyeViewerButton 
          viewerCount={yourViewerCount} 
          onClick={() => setFriendsPanelOpen(!friendsPanelOpen)}
          isActive={friendsPanelOpen}
        />
      </div>

      {/* Bottom Right - Functions Button */}
      <div className="absolute bottom-6 right-6 z-30">
        <button
          onClick={() => {
            setFunctionsPanelOpen(!functionsPanelOpen);
            setFriendsPanelOpen(false);
          }}
          className={`bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-105 touch-manipulation ${
            functionsPanelOpen ? 'ring-4 ring-purple-300/50' : ''
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </button>
      </div>

      {/* Friends Panel */}
      {friendsPanelOpen && (
        <>
          <div 
            className="absolute inset-0 bg-black/20 z-40"
            onClick={() => setFriendsPanelOpen(false)}
          />
          <div className="absolute bottom-24 left-6 w-80 max-w-[calc(100vw-3rem)] bg-gray-800/95 backdrop-blur border border-gray-600 rounded-xl shadow-2xl z-50">
            <div className="p-4 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Friends</h3>
                <button 
                  onClick={() => setFriendsPanelOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              <p className="text-gray-400 text-sm">
                <Companions gameId={gameId} currentUserId={currentUserId} />
              </p>
            </div>
          </div>
        </>
      )}

      {/* Functions Panel */}
      {functionsPanelOpen && (
        <>
          <div 
            className="absolute inset-0 bg-black/20 z-40"
            onClick={() => setFunctionsPanelOpen(false)}
          />
          <div className="absolute bottom-24 right-6 w-64 max-w-[calc(100vw-3rem)] bg-gray-800/95 backdrop-blur border border-gray-600 rounded-xl shadow-2xl z-50">
            <div className="p-4 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Game Menu</h3>
                <button 
                  onClick={() => setFunctionsPanelOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-2">
              <div className="space-y-1">
                <button className="w-full text-left px-3 py-2 text-white hover:bg-gray-700 rounded flex items-center space-x-3">
                  <span>📊</span>
                  <span>Game Stats</span>
                </button>
                <button className="w-full text-left px-3 py-2 text-white hover:bg-gray-700 rounded flex items-center space-x-3">
                  <span>⚙️</span>
                  <span>Settings</span>
                </button>
                <button className="w-full text-left px-3 py-2 text-white hover:bg-gray-700 rounded flex items-center space-x-3">
                  <span>🏠</span>
                  <span>Back to Sanctum</span>
                </button>
                <button className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-900/20 rounded flex items-center space-x-3">
                  <span>🚪</span>
                  <span>Leave Game</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}