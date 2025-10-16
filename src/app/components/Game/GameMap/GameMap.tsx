// app/components/Game/GameMap/GameMap.tsx - FALLOUT/WARHAMMER THEME
'use client'

import { useState } from 'react';
import { TERRITORY_POSITIONS } from '@/app/components/Game/GameData/gameData';

// 🎨 Commander and Base Icons
const COMMANDER_SYMBOLS = {
  land: '⛰️',
  diplomat: '👤',
  nuclear: '⚡',
  naval: '🚢',
};

const BASE_SYMBOL = '🏰';

interface GameMapProps {
  gameState: any;
  selectedTerritory: string | null;
  onTerritoryClick: (territoryId: string) => void;
  interactionMode: string;
  cardSelectedTerritories?: string[];
}

export const GameMap = ({ 
  gameState, 
  selectedTerritory, 
  onTerritoryClick, 
  interactionMode,
  cardSelectedTerritories = []
}: GameMapProps) => {
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 900, height: 450 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [touches, setTouches] = useState([]);

  const isWaterTerritory = (territory) => territory?.type === 'water';

  // 🎨 FALLOUT COLORS - Rusty, weathered palette
  const getNodeColor = (territory) => {
    const owner = gameState.players.find(p => p.id === territory.ownerId);
    const colorMap = {
      'blue': '#4a7c9e',    // Steel blue (weathered metal)
      'red': '#a83832',     // Rust red
      'green': '#6b8e3f',   // Military olive
      'purple': '#7a5b87',  // Faded purple
      'yellow': '#c8a14d'   // Brass/gold
    };
    return colorMap[owner?.color] || '#5a5a52'; // Weathered gray
  };

  const getTerritoryOpacity = (territory) => {
    if (isWaterTerritory(territory)) {
      return selectedTerritory === territory.id ? 1.0 : 0.4;
    }
    return 1.0;
  };

  const isCardSelectedTerritory = (territoryId) => {
    return cardSelectedTerritories.includes(territoryId);
  };

  const isConnectionHighlighted = (territoryId1, territoryId2) => {
    return selectedTerritory === territoryId1 || selectedTerritory === territoryId2;
  };

  const getTerritoryExtras = (territory) => {
    const extras = [];
    if (territory.landCommander) extras.push({ type: 'land', symbol: COMMANDER_SYMBOLS.land, color: '#8b6f3e' });
    if (territory.diplomatCommander) extras.push({ type: 'diplomat', symbol: COMMANDER_SYMBOLS.diplomat, color: '#4a7c9e' });
    if (territory.nuclearCommander) extras.push({ type: 'nuclear', symbol: COMMANDER_SYMBOLS.nuclear, color: '#d97706' });
    if (territory.navalCommander) extras.push({ type: 'naval', symbol: COMMANDER_SYMBOLS.naval, color: '#0e7490' });
    if (territory.spaceBase) extras.push({ type: 'base', symbol: BASE_SYMBOL, color: '#92400e' });
    return extras;
  };

  const getPointerPosition = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    setIsPanning(true);
    setLastPanPoint(getPointerPosition(e));
    e.preventDefault();
  };

  const handlePointerMove = (e) => {
    if (!isPanning) return;
    const point = getPointerPosition(e);
    const deltaX = (lastPanPoint.x - point.x) * (1 / zoom);
    const deltaY = (lastPanPoint.y - point.y) * (1 / zoom);
    setViewBox(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
    setLastPanPoint(point);
    e.preventDefault();
  };

  const handlePointerUp = () => setIsPanning(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta));
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldX = viewBox.x + (x / rect.width) * viewBox.width;
    const worldY = viewBox.y + (y / rect.height) * viewBox.height;
    const newWidth = 900 / newZoom;
    const newHeight = 450 / newZoom;
    setViewBox({
      x: worldX - (x / rect.width) * newWidth,
      y: worldY - (y / rect.height) * newHeight,
      width: newWidth,
      height: newHeight
    });
    setZoom(newZoom);
  };

  const handleTouchStart = (e) => {
    const touchArray = Array.from(e.touches);
    setTouches(touchArray);
    if (touchArray.length === 1) handlePointerDown(e);
  };

  const handleTouchMove = (e) => {
    const touchArray = Array.from(e.touches);
    if (touchArray.length === 2 && touches.length === 2) {
      const dist1 = Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
      const dist2 = Math.hypot(touchArray[0].clientX - touchArray[1].clientX, touchArray[0].clientY - touchArray[1].clientY);
      const scale = dist2 / dist1;
      const newZoom = Math.max(0.5, Math.min(3, zoom * scale));
      const centerX = (touchArray[0].clientX + touchArray[1].clientX) / 2;
      const centerY = (touchArray[0].clientY + touchArray[1].clientY) / 2;
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeX = centerX - rect.left;
      const relativeY = centerY - rect.top;
      const worldX = viewBox.x + (relativeX / rect.width) * viewBox.width;
      const worldY = viewBox.y + (relativeY / rect.height) * viewBox.height;
      const newWidth = 900 / newZoom;
      const newHeight = 450 / newZoom;
      setViewBox({
        x: worldX - (relativeX / rect.width) * newWidth,
        y: worldY - (relativeY / rect.height) * newHeight,
        width: newWidth,
        height: newHeight
      });
      setZoom(newZoom);
      setTouches(touchArray);
    } else if (touchArray.length === 1) {
      handlePointerMove(e);
    }
    e.preventDefault();
  };

  const handleTouchEnd = (e) => {
    setTouches(Array.from(e.touches));
    if (e.touches.length === 0) handlePointerUp();
  };

  const handleTerritoryClick = (territoryId, e) => {
    if (isPanning) return;
    e.stopPropagation();
    onTerritoryClick(territoryId);
  };

  const resetView = () => {
    setViewBox({ x: 0, y: 0, width: 900, height: 450 });
    setZoom(1);
  };

  const zoomIn = () => {
    const centerPoint = { x: 450, y: 225 };
    const newZoom = Math.max(0.5, Math.min(3, zoom * 1.1));
    const worldX = viewBox.x + (centerPoint.x / 900) * viewBox.width;
    const worldY = viewBox.y + (centerPoint.y / 450) * viewBox.height;
    const newWidth = 900 / newZoom;
    const newHeight = 450 / newZoom;
    setViewBox({
      x: worldX - (centerPoint.x / 900) * newWidth,
      y: worldY - (centerPoint.y / 450) * newHeight,
      width: newWidth,
      height: newHeight
    });
    setZoom(newZoom);
  };

  const zoomOut = () => {
    const centerPoint = { x: 450, y: 225 };
    const newZoom = Math.max(0.5, Math.min(3, zoom * 0.9));
    const worldX = viewBox.x + (centerPoint.x / 900) * viewBox.width;
    const worldY = viewBox.y + (centerPoint.y / 450) * viewBox.height;
    const newWidth = 900 / newZoom;
    const newHeight = 450 / newZoom;
    setViewBox({
      x: worldX - (centerPoint.x / 900) * newWidth,
      y: worldY - (centerPoint.y / 450) * newHeight,
      width: newWidth,
      height: newHeight
    });
    setZoom(newZoom);
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-zinc-900 via-stone-900 to-amber-950 rounded-lg overflow-hidden border-2 border-amber-900/40 shadow-[inset_0_2px_20px_rgba(120,53,15,0.3)]">
      {/* 🎨 FALLOUT ZOOM CONTROLS - Rusty buttons */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <button
          onClick={zoomIn}
          className="bg-gradient-to-br from-amber-800/90 to-orange-900/90 hover:from-amber-700 hover:to-orange-800 text-amber-100 w-10 h-10 rounded border-2 border-amber-600/50 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-all font-bold"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="bg-gradient-to-br from-amber-800/90 to-orange-900/90 hover:from-amber-700 hover:to-orange-800 text-amber-100 w-10 h-10 rounded border-2 border-amber-600/50 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-all font-bold"
        >
          -
        </button>
        <button
          onClick={resetView}
          className="bg-gradient-to-br from-amber-800/90 to-orange-900/90 hover:from-amber-700 hover:to-orange-800 text-amber-100 w-10 h-10 rounded border-2 border-amber-600/50 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-all text-xs"
        >
          🏠
        </button>
      </div>

      {/* 🎨 FALLOUT ZOOM INDICATOR */}
      <div className="absolute bottom-4 right-4 z-10 bg-gradient-to-br from-amber-900/90 to-orange-950/90 border-2 border-amber-600/40 text-amber-100 px-3 py-1 rounded text-xs font-bold shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
        {Math.round(zoom * 100)}%
      </div>

      <svg 
        width="100%" 
        height="100%" 
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="touch-none select-none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <defs>
          {/* 🎨 FALLOUT GRADIENTS - Amber/orange theme */}
          <linearGradient id="shimmerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(217, 119, 6, 0.2)">
              <animate attributeName="stop-opacity" values="0.2;0.7;0.2" dur="2s" repeatCount="indefinite"/>
            </stop>
            <stop offset="50%" stopColor="rgba(217, 119, 6, 0.7)">
              <animate attributeName="stop-opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor="rgba(217, 119, 6, 0.2)">
              <animate attributeName="stop-opacity" values="0.2;0.7;0.2" dur="2s" repeatCount="indefinite"/>
            </stop>
          </linearGradient>
          
          <linearGradient id="tripwireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(180, 83, 9, 0.3)">
              <animate attributeName="stop-opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite"/>
            </stop>
            <stop offset="50%" stopColor="rgba(234, 179, 8, 0.6)">
              <animate attributeName="stop-opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor="rgba(180, 83, 9, 0.3)">
              <animate attributeName="stop-opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite"/>
            </stop>
          </linearGradient>

          <linearGradient id="cardSelectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(132, 204, 22, 0.4)">
              <animate attributeName="stop-opacity" values="0.4;0.8;0.4" dur="1s" repeatCount="indefinite"/>
            </stop>
            <stop offset="50%" stopColor="rgba(132, 204, 22, 0.8)">
              <animate attributeName="stop-opacity" values="0.8;1;0.8" dur="1s" repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor="rgba(132, 204, 22, 0.4)">
              <animate attributeName="stop-opacity" values="0.4;0.8;0.4" dur="1s" repeatCount="indefinite"/>
            </stop>
          </linearGradient>

          {/* 🎨 RUST TEXTURE PATTERN */}
          <pattern id="rustTexture" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#1c1917"/>
            <circle cx="5" cy="5" r="1" fill="#78350f" opacity="0.3"/>
            <circle cx="15" cy="10" r="1.5" fill="#92400e" opacity="0.2"/>
            <circle cx="10" cy="15" r="1" fill="#451a03" opacity="0.4"/>
          </pattern>
        </defs>

        {/* Background texture */}
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#rustTexture)" opacity="0.1"/>

        {/* 🎨 FALLOUT CONNECTIONS - Rust-colored, weathered */}
        {Object.values(gameState.territories).map(territory => 
          territory.connections.map(connId => {
            const fromPos = TERRITORY_POSITIONS[territory.id];
            const toPos = TERRITORY_POSITIONS[connId];
            if (fromPos && toPos && parseInt(territory.id) < parseInt(connId)) {
              const isHighlighted = isConnectionHighlighted(territory.id, connId);
              
              return (
                <g key={`${territory.id}-${connId}`}>
                  {isHighlighted && (
                    <line
                      x1={fromPos.x} y1={fromPos.y}
                      x2={toPos.x} y2={toPos.y}
                      stroke="url(#tripwireGradient)"
                      strokeWidth="3"
                      opacity="0.7"
                      className="animate-pulse"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(217, 119, 6, 0.6))' }}
                    />
                  )}
                  
                  <line
                    x1={fromPos.x} y1={fromPos.y}
                    x2={toPos.x} y2={toPos.y}
                    stroke={isHighlighted ? "rgba(217, 119, 6, 0.5)" : "rgba(120, 53, 15, 0.25)"}
                    strokeWidth={isHighlighted ? "2" : "1"}
                    strokeDasharray={isHighlighted ? "4,4" : "none"}
                    opacity={isHighlighted ? "0.8" : "0.6"}
                    className="transition-all duration-300"
                    style={{ filter: isHighlighted ? 'drop-shadow(0 0 2px rgba(217, 119, 6, 0.4))' : 'none' }}
                  />
                </g>
              );
            }
            return null;
          })
        )}

        {/* 🎨 FALLOUT TERRITORIES - Weathered metal look */}
        {Object.values(gameState.territories).map(territory => {
          const position = TERRITORY_POSITIONS[territory.id];
          if (!position) return null;
          
          const isSelected = selectedTerritory === territory.id;
          const isCardSelected = isCardSelectedTerritory(territory.id);
          const nodeColor = getNodeColor(territory);
          const extras = getTerritoryExtras(territory);
          const territoryOpacity = getTerritoryOpacity(territory);
          const isWater = isWaterTerritory(territory);
          
          return (
            <g key={territory.id} opacity={territoryOpacity}>
              {isSelected && (
                <circle
                  cx={position.x} cy={position.y}
                  r={32}
                  fill="none"
                  stroke="rgba(217, 119, 6, 0.5)"
                  strokeWidth="3"
                  className="animate-pulse"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(217, 119, 6, 0.7))' }}
                />
              )}

              {isCardSelected && (
                <circle
                  cx={position.x} cy={position.y}
                  r={36}
                  fill="none"
                  stroke="url(#cardSelectionGradient)"
                  strokeWidth="4"
                  className="animate-pulse"
                  style={{ filter: 'drop-shadow(0 0 12px rgba(132, 204, 22, 0.8))' }}
                />
              )}
              
              {/* Outer metallic ring */}
              <circle
                cx={position.x} cy={position.y}
                r={isSelected ? 26 : 22}
                fill="none"
                stroke={isCardSelected ? '#84cc16' : isSelected ? '#d97706' : (isWater ? '#0e7490' : '#78350f')}
                strokeWidth="2"
                opacity="0.6"
              />

              {/* Main territory circle with metallic gradient */}
              <circle
                cx={position.x} cy={position.y}
                r={isSelected ? 24 : 20}
                fill={nodeColor}
                stroke={isCardSelected ? '#84cc16' : isSelected ? '#d97706' : (isWater ? '#0e7490' : '#92400e')}
                strokeWidth={isCardSelected || isSelected ? 3 : 2}
                className="cursor-pointer transition-all duration-200 hover:opacity-90"
                onClick={(e) => handleTerritoryClick(territory.id, e)}
                style={{ 
                  cursor: isPanning ? 'grabbing' : 'pointer',
                  filter: isCardSelected ? 'drop-shadow(0 0 8px rgba(132, 204, 22, 0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))' :
                          isSelected ? 'drop-shadow(0 0 6px rgba(217, 119, 6, 0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))' : 
                          'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                }}
              />

              {isCardSelected && (
                <circle
                  cx={position.x + 12}
                  cy={position.y - 12}
                  r="6"
                  fill="#84cc16"
                  stroke="#fef3c7"
                  strokeWidth="2"
                  className="pointer-events-none"
                />
              )}
              
              {/* Unit count with enhanced shadow */}
              <text
                x={position.x} y={position.y + 4}
                textAnchor="middle"
                className="text-amber-50 text-sm font-bold pointer-events-none select-none"
                style={{ 
                  fontSize: '12px',
                  filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.9))'
                }}
              >
                {territory.machineCount}
              </text>
              
              {/* Commander/Base indicators */}
              {extras.length > 0 && (
                <g>
                  {extras.map((extra, index) => {
                    const angle = (index * (2 * Math.PI)) / Math.max(extras.length, 4);
                    const radius = 30;
                    const indicatorX = position.x + radius * Math.cos(angle);
                    const indicatorY = position.y + radius * Math.sin(angle);
                    
                    return (
                      <g key={`${territory.id}-${extra.type}`}>
                        <circle
                          cx={indicatorX}
                          cy={indicatorY}
                          r="8"
                          fill="#fef3c7"
                          stroke={extra.color}
                          strokeWidth="2"
                          className="pointer-events-none"
                          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
                        />
                        
                        <text
                          x={indicatorX}
                          y={indicatorY + 3}
                          textAnchor="middle"
                          className="pointer-events-none select-none"
                          style={{ 
                            fontSize: '10px',
                            fill: extra.color,
                            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))'
                          }}
                        >
                          {extra.symbol}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* 🎨 FALLOUT INFO OVERLAY */}
      {selectedTerritory && (
        <div className="absolute top-4 left-4 bg-gradient-to-br from-amber-900/95 to-orange-950/95 backdrop-blur-sm rounded border-2 border-amber-600/50 p-3 shadow-[0_4px_20px_rgba(0,0,0,0.6)] max-w-64 z-10">
          <div className="text-sm">
            <h3 className="font-bold text-amber-100 mb-1">
              {gameState.territories[selectedTerritory]?.name}
              {isWaterTerritory(gameState.territories[selectedTerritory]) && (
                <span className="ml-2 text-cyan-400 text-xs">🌊 Water</span>
              )}
              {isCardSelectedTerritory(selectedTerritory) && (
                <span className="ml-2 text-lime-400 text-xs">🎯 Selected</span>
              )}
            </h3>
            <p className="text-amber-200">
              Units: {gameState.territories[selectedTerritory]?.machineCount}
            </p>
            <p className="text-amber-200">
              Owner: {gameState.players.find(p => p.id === gameState.territories[selectedTerritory]?.ownerId)?.name || 'Neutral'}
            </p>
            
            {(() => {
              const territory = gameState.territories[selectedTerritory];
              const extras = getTerritoryExtras(territory);
              
              if (extras.length > 0) {
                return (
                  <div className="mt-2 pt-2 border-t border-amber-700/50">
                    <p className="text-xs text-amber-400 mb-1">Special Units:</p>
                    <div className="space-y-1">
                      {extras.map((extra, index) => (
                        <div key={index} className="flex items-center space-x-1">
                          <span style={{ color: extra.color }}>{extra.symbol}</span>
                          <span className="text-xs text-amber-200 capitalize">
                            {extra.type === 'land' && 'Land Commander'}
                            {extra.type === 'diplomat' && 'Diplomat'}
                            {extra.type === 'nuclear' && 'Nuclear Commander'}
                            {extra.type === 'naval' && 'Naval Commander'}
                            {extra.type === 'base' && 'Space Base'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}

      {/* 🎨 FALLOUT NAVIGATION HINT */}
      <div className="absolute bottom-4 left-4 z-10 bg-gradient-to-br from-amber-900/90 to-orange-950/90 border-2 border-amber-600/40 text-amber-100 px-3 py-1 rounded text-xs max-w-48 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
        🖱️ Drag to pan • 🔍 Scroll/pinch to zoom
      </div>
    </div>
  );
};