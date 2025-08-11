// Enhanced GameMap.tsx - WITH COMMANDER AND BASE ICONS
'use client'

import { useState } from 'react';
import { TERRITORY_POSITIONS } from '@/app/components/Game/GameData/gameData';

// 🎨 Commander and Base Icons (using text/emoji for SVG compatibility)
const COMMANDER_SYMBOLS = {
  land: '⛰️',        // Land Commander
  diplomat: '👤',    // Diplomat Commander  
  nuclear: '⚡',        // Nuclear Commander
  naval: '🚢',       // Naval Commander
};

const BASE_SYMBOL = '🏰';  // Space Base

export const GameMap = ({ gameState, selectedTerritory, onTerritoryClick, interactionMode }) => {
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 900, height: 450 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [touches, setTouches] = useState([]);

  const getNodeColor = (territory) => {
    const owner = gameState.players.find(p => p.id === territory.ownerId);
    const colorMap = {
      'purple': '#a855f7',
      'green': '#22c55e',
      'blue': '#3b82f6',
      'red': '#ef4444', 
      'yellow': '#eab308'
    };
    return colorMap[owner?.color] || '#9ca3af';
  };

  // Get all commanders and bases on a territory
  const getTerritoryExtras = (territory) => {
    const extras = [];
    
    // Check for commanders
    if (territory.landCommander) {
      extras.push({ type: 'land', symbol: COMMANDER_SYMBOLS.land, color: '#8b5cf6' });
    }
    if (territory.diplomatCommander) {
      extras.push({ type: 'diplomat', symbol: COMMANDER_SYMBOLS.diplomat, color: '#3b82f6' });
    }
    if (territory.nuclearCommander) {  // ✅ Change to 'nuclearCommander'
      extras.push({ type: 'nuclear', symbol: COMMANDER_SYMBOLS.nuclear, color: '#ef4444' });
    }
    if (territory.navalCommander) {    // ✅ Change to 'navalCommander' 
      extras.push({ type: 'naval', symbol: COMMANDER_SYMBOLS.naval, color: '#06b6d4' });
    }
    
    // Check for space base
    if (territory.spaceBase) {
      extras.push({ type: 'base', symbol: BASE_SYMBOL, color: '#7c3aed' });
    }
    
    return extras;
  };

  // Get pointer position (works for both mouse and touch)
  const getPointerPosition = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Handle mouse/touch events for panning
  const handlePointerDown = (e) => {
    setIsPanning(true);
    const point = getPointerPosition(e);
    setLastPanPoint(point);
    e.preventDefault();
  };

  const handlePointerMove = (e) => {
    if (!isPanning) return;
    
    const point = getPointerPosition(e);
    const deltaX = (lastPanPoint.x - point.x) * (1 / zoom);
    const deltaY = (lastPanPoint.y - point.y) * (1 / zoom);
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastPanPoint(point);
    e.preventDefault();
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  // Handle zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta));
    
    // Zoom towards cursor position
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const worldX = viewBox.x + (x / rect.width) * viewBox.width;
    const worldY = viewBox.y + (y / rect.height) * viewBox.height;
    
    const newWidth = 900 / newZoom;
    const newHeight = 450 / newZoom;
    
    setViewBox({
      x: worldX - (x / rect.width) * newWidth,
      y: worldY - (y / rect.height) * newWidth,
      width: newWidth,
      height: newHeight
    });
    
    setZoom(newZoom);
  };

  // Touch zoom handling (pinch to zoom)
  const handleTouchStart = (e) => {
    const touchArray = Array.from(e.touches);
    setTouches(touchArray);
    
    if (touchArray.length === 1) {
      handlePointerDown(e);
    }
  };

  const handleTouchMove = (e) => {
    const touchArray = Array.from(e.touches);
    
    if (touchArray.length === 2 && touches.length === 2) {
      // Pinch to zoom
      const dist1 = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      const dist2 = Math.hypot(
        touchArray[0].clientX - touchArray[1].clientX,
        touchArray[0].clientY - touchArray[1].clientY
      );
      
      const scale = dist2 / dist1;
      const newZoom = Math.max(0.5, Math.min(3, zoom * scale));
      
      // Get center point of pinch
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
    if (e.touches.length === 0) {
      handlePointerUp();
    }
  };

  // Handle territory clicks (only when not panning)
  const handleTerritoryClick = (territoryId, e) => {
    if (isPanning) return; // Don't trigger clicks while panning
    e.stopPropagation();
    onTerritoryClick(territoryId);
  };

  // Reset view button
  const resetView = () => {
    setViewBox({ x: 0, y: 0, width: 900, height: 450 });
    setZoom(1);
  };

  // Zoom in/out programmatically
  const zoomIn = () => {
    const rect = { width: 900, height: 450 };
    const centerPoint = { x: 450, y: 225 };
    
    const newZoom = Math.max(0.5, Math.min(3, zoom * 1.1));
    const worldX = viewBox.x + (centerPoint.x / rect.width) * viewBox.width;
    const worldY = viewBox.y + (centerPoint.y / rect.height) * viewBox.height;
    
    const newWidth = 900 / newZoom;
    const newHeight = 450 / newZoom;
    
    setViewBox({
      x: worldX - (centerPoint.x / rect.width) * newWidth,
      y: worldY - (centerPoint.y / rect.height) * newHeight,
      width: newWidth,
      height: newHeight
    });
    
    setZoom(newZoom);
  };

  const zoomOut = () => {
    const rect = { width: 900, height: 450 };
    const centerPoint = { x: 450, y: 225 };
    
    const newZoom = Math.max(0.5, Math.min(3, zoom * 0.9));
    const worldX = viewBox.x + (centerPoint.x / rect.width) * viewBox.width;
    const worldY = viewBox.y + (centerPoint.y / rect.height) * viewBox.height;
    
    const newWidth = 900 / newZoom;
    const newHeight = 450 / newZoom;
    
    setViewBox({
      x: worldX - (centerPoint.x / rect.width) * newWidth,
      y: worldY - (centerPoint.y / rect.height) * newHeight,
      width: newWidth,
      height: newHeight
    });
    
    setZoom(newZoom);
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-purple-50 to-green-50 rounded-lg overflow-hidden">
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <button
          onClick={zoomIn}
          className="bg-white/90 hover:bg-white text-gray-800 w-10 h-10 rounded-lg flex items-center justify-center shadow-lg transition-colors"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="bg-white/90 hover:bg-white text-gray-800 w-10 h-10 rounded-lg flex items-center justify-center shadow-lg transition-colors"
        >
          -
        </button>
        <button
          onClick={resetView}
          className="bg-white/90 hover:bg-white text-gray-800 w-10 h-10 rounded-lg flex items-center justify-center shadow-lg transition-colors text-xs"
        >
          🏠
        </button>
      </div>

      {/* Map zoom indicator */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/90 text-gray-800 px-2 py-1 rounded text-xs">
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
        {/* Territory connections */}
        {Object.values(gameState.territories).map(territory => 
          territory.connections.map(connId => {
            const fromPos = TERRITORY_POSITIONS[territory.id];
            const toPos = TERRITORY_POSITIONS[connId];
            if (fromPos && toPos && parseInt(territory.id) < parseInt(connId)) {
              return (
                <line
                  key={`${territory.id}-${connId}`}
                  x1={fromPos.x} y1={fromPos.y}
                  x2={toPos.x} y2={toPos.y}
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth="2"
                />
              );
            }
            return null;
          })
        )}

        {/* Territories */}
        {Object.values(gameState.territories).map(territory => {
          const position = TERRITORY_POSITIONS[territory.id];
          if (!position) return null;
          
          const isSelected = selectedTerritory === territory.id;
          const nodeColor = getNodeColor(territory);
          const extras = getTerritoryExtras(territory);
          
          return (
            <g key={territory.id}>
              {/* Main territory circle */}
              <circle
                cx={position.x} cy={position.y}
                r={isSelected ? 24 : 20}
                fill={nodeColor}
                stroke={isSelected ? '#000' : '#fff'}
                strokeWidth={isSelected ? 3 : 2}
                className="cursor-pointer transition-all duration-200 hover:opacity-80"
                onClick={(e) => handleTerritoryClick(territory.id, e)}
                style={{ cursor: isPanning ? 'grabbing' : 'pointer' }}
              />
              
              {/* Unit count */}
              <text
                x={position.x} y={position.y + 4}
                textAnchor="middle"
                className="text-white text-sm font-bold pointer-events-none select-none"
                style={{ fontSize: '12px' }}
              >
                {territory.machineCount}
              </text>
              
              {/* 🎨 NEW: Commander and Base indicators */}
              {extras.length > 0 && (
                <g>
                  {extras.map((extra, index) => {
                    // Position indicators around the territory circle
                    const angle = (index * (2 * Math.PI)) / Math.max(extras.length, 4);
                    const radius = 30;
                    const indicatorX = position.x + radius * Math.cos(angle);
                    const indicatorY = position.y + radius * Math.sin(angle);
                    
                    return (
                      <g key={`${territory.id}-${extra.type}`}>
                        {/* Background circle for indicator */}
                        <circle
                          cx={indicatorX}
                          cy={indicatorY}
                          r="8"
                          fill="white"
                          stroke={extra.color}
                          strokeWidth="2"
                          className="pointer-events-none"
                        />
                        
                        {/* Commander/Base symbol */}
                        <text
                          x={indicatorX}
                          y={indicatorY + 3}
                          textAnchor="middle"
                          className="pointer-events-none select-none"
                          style={{ 
                            fontSize: '10px',
                            fill: extra.color
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

      {/* 🎨 ENHANCED: Territory info overlay with commander details */}
      {selectedTerritory && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-64 z-10">
          <div className="text-sm">
            <h3 className="font-bold text-gray-800 mb-1">
              {gameState.territories[selectedTerritory]?.name}
            </h3>
            <p className="text-gray-600">
              Units: {gameState.territories[selectedTerritory]?.machineCount}
            </p>
            <p className="text-gray-600">
              Owner: {gameState.players.find(p => p.id === gameState.territories[selectedTerritory]?.ownerId)?.name}
            </p>
            
            {/* Show commanders and bases */}
            {(() => {
              const territory = gameState.territories[selectedTerritory];
              const extras = getTerritoryExtras(territory);
              
              if (extras.length > 0) {
                return (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Special Units:</p>
                    <div className="space-y-1">
                      {extras.map((extra, index) => (
                        <div key={index} className="flex items-center space-x-1">
                          <span style={{ color: extra.color }}>{extra.symbol}</span>
                          <span className="text-xs text-gray-600 capitalize">
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

      {/* Navigation instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 text-gray-800 px-2 py-1 rounded text-xs max-w-48">
        🖱️ Drag to pan • 🔍 Scroll/pinch to zoom
      </div>
    </div>
  );
};