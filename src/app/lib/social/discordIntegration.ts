// app/lib/social/discordIntegration.ts

/**
 * Retrieves the Discord thread URL for a game if it exists
 */
export async function getDiscordThreadUrl(
    cardGameId: string,
    env: any
  ): Promise<string | null> {
    if (!env.CARD_GAME_REGISTRY_KV) {
      return null
    }
    
    try {
      const discordData = await env.CARD_GAME_REGISTRY_KV.get(
        `discord:${cardGameId}`,
        "json"
      ) as { threadUrl?: string } | null
      
      return discordData?.threadUrl ?? null
    } catch (error) {
      console.error('Failed to check for Discord thread:', error)
      return null
    }
  }