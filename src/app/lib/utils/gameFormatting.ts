// app/lib/utils/gameFormatting.ts

/**
 * Formats a game ID into a human-readable game name
 * Example: "epic-dragon-quest" -> "Epic Dragon Quest"
 */
export function formatGameName(gameId: string): string {
    return gameId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  
  /**
   * Formats a player name with fallbacks
   */
  export function formatPlayerName(
    name?: string,
    email?: string,
    defaultName: string = 'Player'
  ): string {
    return name || email || defaultName
  }