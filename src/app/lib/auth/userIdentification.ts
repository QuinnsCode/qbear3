// app/lib/auth/userIdentification.ts

interface GetUserIdParams {
    ctx: any
    request: Request
    cardGameId: string
    isSandbox: boolean
  }
  
  interface UserIdentity {
    userId: string
    userName: string
    isLoggedIn: boolean
  }
  
  /**
   * Gets or creates a user ID for the current session.
   * Handles logged-in users, sandbox users, and spectators.
   * Includes self-healing for invalid cookie IDs.
   */
  export async function getOrCreateUserId({
    ctx,
    request,
    cardGameId,
    isSandbox
  }: GetUserIdParams): Promise<UserIdentity> {
    
    // Logged-in user
    if (ctx.user?.id) {
      return {
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.email || (isSandbox ? 'Chaos Player' : 'Player'),
        isLoggedIn: !ctx.user.id.startsWith('sandbox_')
      }
    }
  
    // Anonymous user - check for existing cookie
    const cookieName = isSandbox ? `sandbox_user_${cardGameId}` : 'spectator_user'
    const existingId = extractCookieValue(request, cookieName)
    
    if (existingId) {
      // Validate that the cookie ID still exists in the game
      const isValid = await validateUserInGame(cardGameId, existingId)
      
      if (isValid) {
        return {
          userId: existingId,
          userName: isSandbox ? 'Chaos Player' : 'Spectator',
          isLoggedIn: false
        }
      }
      
      // Self-heal: Cookie ID no longer valid
      console.log('Self-healing: Cookie ID not in game, generating new ID')
    }
  
    // Generate new ID for anonymous user
    return generateAnonymousUser(isSandbox)
  }
  
  function extractCookieValue(request: Request, cookieName: string): string | null {
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) return null
    
    const cookie = cookieHeader
      .split(';')
      .find(c => c.trim().startsWith(`${cookieName}=`))
    
    return cookie?.split('=')[1] ?? null
  }
  
  async function validateUserInGame(cardGameId: string, userId: string): Promise<boolean> {
    try {
      const { getCardGameState } = await import('@/app/serverActions/cardGame/cardGameActions')
      const gameState = await getCardGameState(cardGameId)
      return gameState.players.some(p => p.id === userId)
    } catch (error) {
      console.error('Error validating user in game:', error)
      return false
    }
  }
  
  function generateAnonymousUser(isSandbox: boolean): UserIdentity {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const prefix = isSandbox ? 'sandbox' : 'spectator'
    
    return {
      userId: `${prefix}-${timestamp}-${random}`,
      userName: isSandbox ? 'Chaos Player' : 'Spectator',
      isLoggedIn: false
    }
  }