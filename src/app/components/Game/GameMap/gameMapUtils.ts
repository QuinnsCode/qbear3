// app/components/Game/gameMapUtils.ts

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface MapInteractionState {
  viewBox: ViewBox;
  zoom: number;
  isPanning: boolean;
  lastPanPoint: Point;
  touches: Touch[];
}

// Constants
export const DEFAULT_VIEWBOX: ViewBox = { x: 0, y: 0, width: 900, height: 450 };
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.1;

// Get pointer position from mouse or touch event
export const getPointerPosition = (e: MouseEvent | TouchEvent, element: Element): Point => {
  const rect = element.getBoundingClientRect();
  const isTouch = 'touches' in e && e.touches.length > 0;
  const clientX = isTouch ? e.touches[0].clientX : (e as MouseEvent).clientX;
  const clientY = isTouch ? e.touches[0].clientY : (e as MouseEvent).clientY;
  
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
};

// Calculate new viewbox for panning
export const calculatePanViewBox = (
  currentViewBox: ViewBox,
  deltaX: number,
  deltaY: number,
  zoom: number
): ViewBox => {
  const scaledDeltaX = deltaX * (1 / zoom);
  const scaledDeltaY = deltaY * (1 / zoom);
  
  return {
    ...currentViewBox,
    x: currentViewBox.x + scaledDeltaX,
    y: currentViewBox.y + scaledDeltaY
  };
};

// Calculate new viewbox and zoom for wheel/scroll zoom
export const calculateZoomViewBox = (
  currentViewBox: ViewBox,
  currentZoom: number,
  zoomDelta: number,
  centerPoint: Point,
  elementRect: DOMRect
): { viewBox: ViewBox; zoom: number } => {
  const zoomFactor = zoomDelta > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * zoomFactor));
  
  // Calculate world coordinates of zoom center
  const worldX = currentViewBox.x + (centerPoint.x / elementRect.width) * currentViewBox.width;
  const worldY = currentViewBox.y + (centerPoint.y / elementRect.height) * currentViewBox.height;
  
  // Calculate new viewbox dimensions
  const newWidth = 900 / newZoom;
  const newHeight = 450 / newZoom;
  
  // Center the zoom around the cursor/touch point
  const newViewBox: ViewBox = {
    x: worldX - (centerPoint.x / elementRect.width) * newWidth,
    y: worldY - (centerPoint.y / elementRect.height) * newHeight,
    width: newWidth,
    height: newHeight
  };
  
  return { viewBox: newViewBox, zoom: newZoom };
};

// Calculate distance between two points (for pinch zoom)
export const calculateDistance = (point1: Point, point2: Point): number => {
  return Math.hypot(point1.x - point2.x, point1.y - point2.y);
};

// Calculate center point between two touches
export const calculateTouchCenter = (touch1: Touch, touch2: Touch): Point => {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  };
};

// Calculate new viewbox and zoom for pinch zoom
export const calculatePinchZoom = (
  currentViewBox: ViewBox,
  currentZoom: number,
  oldDistance: number,
  newDistance: number,
  centerPoint: Point,
  elementRect: DOMRect
): { viewBox: ViewBox; zoom: number } => {
  const scale = newDistance / oldDistance;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * scale));
  
  // Calculate world coordinates of pinch center
  const relativeX = centerPoint.x - elementRect.left;
  const relativeY = centerPoint.y - elementRect.top;
  
  const worldX = currentViewBox.x + (relativeX / elementRect.width) * currentViewBox.width;
  const worldY = currentViewBox.y + (relativeY / elementRect.height) * currentViewBox.height;
  
  // Calculate new viewbox
  const newWidth = 900 / newZoom;
  const newHeight = 450 / newZoom;
  
  const newViewBox: ViewBox = {
    x: worldX - (relativeX / elementRect.width) * newWidth,
    y: worldY - (relativeY / elementRect.height) * newHeight,
    width: newWidth,
    height: newHeight
  };
  
  return { viewBox: newViewBox, zoom: newZoom };
};

// Get node color based on player ownership
export const getNodeColor = (territory: any, players: any[]): string => {
  const owner = players.find(p => p.id === territory.ownerId);
  const colorMap: Record<string, string> = {
    'blue': '#3b82f6',
    'red': '#ef4444', 
    'green': '#22c55e',
    'purple': '#a855f7',
    'yellow': '#eab308'
  };
  return colorMap[owner?.color] || '#9ca3af';
};

// Convert touch list to array of touch objects
export const touchListToArray = (touchList: TouchList): Touch[] => {
  return Array.from(touchList);
};

// Check if position has territory (for click detection)
export const isValidTerritoryPosition = (territoryId: string, positions: Record<string, Point>): boolean => {
  return positions[territoryId] !== undefined;
};

// Format zoom percentage for display
export const formatZoomPercentage = (zoom: number): string => {
  return `${Math.round(zoom * 100)}%`;
};