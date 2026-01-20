// lib/durableObjectSecurity.ts

/**
 * Generic sanitization helper for Durable Objects
 * Filters sensitive data based on player/user ID
 */

type SanitizationRule<T> = {
    /**
     * Check if this field should be visible to the requesting player
     */
    shouldShow: (data: T, playerId: string, ownerId: string) => boolean
    
    /**
     * What to replace the field with if hidden
     */
    replacement?: any
  }
  
  type SanitizationConfig<T> = {
    [K in keyof T]?: SanitizationRule<T> | 'owner-only' | 'public'
  }
  
  /**
   * Sanitize an object based on player ID and field rules
   */
  export function sanitizeForPlayer<T extends Record<string, any>>(
    data: T,
    playerId: string,
    config: SanitizationConfig<T>
  ): T {
    const result = { ...data }
    
    for (const [field, rule] of Object.entries(config)) {
      if (rule === 'public') {
        // Always visible
        continue
      }
      
      if (rule === 'owner-only') {
        // Only show if playerId matches ownerId
        const ownerId = data.id || data.playerId || data.ownerId
        if (ownerId !== playerId) {
          result[field as keyof T] = undefined as any
        }
      } else if (typeof rule === 'object' && rule.shouldShow) {
        // Custom rule
        const ownerId = data.id || data.playerId || data.ownerId
        if (!rule.shouldShow(data, playerId, ownerId)) {
          result[field as keyof T] = rule.replacement !== undefined ? rule.replacement : undefined
        }
      }
    }
    
    return result
  }
  
  /**
   * Sanitize an array of objects
   */
  export function sanitizeArrayForPlayer<T extends Record<string, any>>(
    items: T[],
    playerId: string,
    config: SanitizationConfig<T>
  ): T[] {
    return items.map(item => sanitizeForPlayer(item, playerId, config))
  }
  
  /**
   * Common sanitization rules for game states
   */
  export const CommonRules = {
    /**
     * Hide field from everyone except owner
     */
    ownerOnly: 'owner-only' as const,
    
    /**
     * Show to everyone
     */
    public: 'public' as const,
    
    /**
     * Hide completely (replace with undefined)
     */
    hidden: {
      shouldShow: () => false
    },
    
    /**
     * Show count but not contents
     */
    showCount: <T extends any[]>(field: T): SanitizationRule<any> => ({
      shouldShow: (data, playerId, ownerId) => playerId === ownerId,
      replacement: { length: field?.length || 0 }
    })
  }
  
  /**
   * Broadcast helper that sanitizes per-player
   */
  export function broadcastSanitized<T>(
    getWebSockets: () => WebSocket[],
    getTags: (ws: WebSocket) => string[],
    message: T,
    sanitizer: (message: T, playerId: string) => T
  ): void {
    const sockets = getWebSockets()
    
    for (const ws of sockets) {
      try {
        const tags = getTags(ws)
        const playerId = tags[1] // Assuming tag[1] is playerId
        
        const sanitized = sanitizer(message, playerId)
        ws.send(JSON.stringify(sanitized))
      } catch (error) {
        console.error('Failed to send sanitized message:', error)
      }
    }
  }
  
  /**
   * Example usage types
   */
  export type PlayerData = {
    id: string
    name: string
    secretData: string[]
    publicScore: number
  }
  
  // Example configuration:
  // const playerConfig: SanitizationConfig<PlayerData> = {
  //   id: 'public',
  //   name: 'public',
  //   secretData: 'owner-only',
  //   publicScore: 'public'
  // }