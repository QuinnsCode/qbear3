// app/lib/cardGame/battlefieldCoordinates.ts

/**
 * Battlefield Coordinate System
 * 
 * BATTLEFIELD SPACE: The full virtual battlefield (e.g., 4000x2000)
 * VIEWPORT SPACE: The visible portion on screen
 * 
 * Cards are stored in battlefield coordinates (0-4000, 0-2000)
 * but rendered relative to the viewport scroll position
 */

export const BATTLEFIELD_CONFIG = {
    // Virtual battlefield size (much larger than viewport)
    WIDTH: 4000,
    HEIGHT: 2000,
    
    // Standard card dimensions in pixels
    CARD_WIDTH: 96,
    CARD_HEIGHT: 128,
  } as const
  
  export interface Point {
    x: number
    y: number
  }
  
  export interface BattlefieldBounds {
    width: number
    height: number
  }
  
  /**
   * Convert screen/viewport coordinates to battlefield coordinates.
   * When scale != 1, the battlefield surface is larger/smaller, so we divide by scale
   * to get back to the logical battlefield coordinate space (0–WIDTH, 0–HEIGHT).
   * @param screenX - X position in viewport (relative to container)
   * @param screenY - Y position in viewport (relative to container)
   * @param scrollLeft - Current horizontal scroll offset
   * @param scrollTop - Current vertical scroll offset
   * @param scale - Current zoom scale (default 1)
   */
  export function screenToBattlefield(
    screenX: number,
    screenY: number,
    scrollLeft: number,
    scrollTop: number,
    scale: number = 1
  ): Point {
    return {
      x: (screenX + scrollLeft) / scale,
      y: (screenY + scrollTop) / scale
    }
  }

  /**
   * Convert battlefield coordinates to screen/viewport coordinates.
   * Multiply by scale to get the rendered pixel position, then subtract scroll.
   * @param battlefieldX - X position in battlefield space
   * @param battlefieldY - Y position in battlefield space
   * @param scrollLeft - Current horizontal scroll offset
   * @param scrollTop - Current vertical scroll offset
   * @param scale - Current zoom scale (default 1)
   */
  export function battlefieldToScreen(
    battlefieldX: number,
    battlefieldY: number,
    scrollLeft: number,
    scrollTop: number,
    scale: number = 1
  ): Point {
    return {
      x: battlefieldX * scale - scrollLeft,
      y: battlefieldY * scale - scrollTop
    }
  }
  
  /**
   * Check if a card is visible in the current viewport
   */
  export function isCardVisible(
    cardX: number,
    cardY: number,
    scrollLeft: number,
    scrollTop: number,
    viewportWidth: number,
    viewportHeight: number
  ): boolean {
    const screenPos = battlefieldToScreen(cardX, cardY, scrollLeft, scrollTop)
    
    return (
      screenPos.x + BATTLEFIELD_CONFIG.CARD_WIDTH > 0 &&
      screenPos.x < viewportWidth &&
      screenPos.y + BATTLEFIELD_CONFIG.CARD_HEIGHT > 0 &&
      screenPos.y < viewportHeight
    )
  }
  
  /**
   * Clamp a position to stay within battlefield bounds (in logical coordinates).
   * The bounds are always the logical battlefield dimensions regardless of scale.
   */
  export function clampToBattlefield(x: number, y: number): Point {
    return {
      x: Math.max(0, Math.min(BATTLEFIELD_CONFIG.WIDTH - BATTLEFIELD_CONFIG.CARD_WIDTH, x)),
      y: Math.max(0, Math.min(BATTLEFIELD_CONFIG.HEIGHT - BATTLEFIELD_CONFIG.CARD_HEIGHT, y))
    }
  }

  /**
   * Get the bounds for a selection box in battlefield coordinates.
   * @param scale - Current zoom scale (default 1)
   */
  export function getSelectionBounds(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    scrollLeft: number,
    scrollTop: number,
    scale: number = 1
  ): { x: number; y: number; width: number; height: number } {
    // Convert screen coordinates to battlefield coordinates
    const start = screenToBattlefield(startX, startY, scrollLeft, scrollTop, scale)
    const end = screenToBattlefield(endX, endY, scrollLeft, scrollTop, scale)

    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)
    const width = Math.abs(end.x - start.x)
    const height = Math.abs(end.y - start.y)

    return { x, y, width, height }
  }
  
  /**
   * Check if a card intersects with a selection box (both in battlefield coordinates)
   */
  export function cardIntersectsSelection(
    cardX: number,
    cardY: number,
    selectionX: number,
    selectionY: number,
    selectionWidth: number,
    selectionHeight: number
  ): boolean {
    return (
      cardX < selectionX + selectionWidth &&
      cardX + BATTLEFIELD_CONFIG.CARD_WIDTH > selectionX &&
      cardY < selectionY + selectionHeight &&
      cardY + BATTLEFIELD_CONFIG.CARD_HEIGHT > selectionY
    )
  }