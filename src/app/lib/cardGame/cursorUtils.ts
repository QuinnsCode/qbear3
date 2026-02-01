// app/lib/cardGame/cursorUtils.ts

const MAX_VISIBLE_CURSORS_SANDBOX = 10

export interface CursorData {
  playerId: string
  current: { x: number; y: number }
}

/**
 * Gets visible cursors, limiting them in sandbox mode
 */
export function getVisibleCursors(
  cursors: Map<string, CursorData>,
  isSandbox: boolean
): CursorData[] {
  const allCursors = Array.from(cursors.values())
  
  if (!isSandbox || allCursors.length <= MAX_VISIBLE_CURSORS_SANDBOX) {
    return allCursors
  }
  
  // Randomly sample cursors for sandbox
  const shuffled = [...allCursors].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, MAX_VISIBLE_CURSORS_SANDBOX)
}