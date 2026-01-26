// lib/userIdentity.ts

/**
 * Generates a unique guest user ID
 */
export function generateGuestId(): string {
    return `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
  
  /**
   * Gets user identity from context, generating guest ID if needed
   */
  export function getUserIdentity(ctx: any): { userId: string; userName: string; isGuest: boolean } {
    if (ctx.user?.id) {
      return {
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.email || 'Player',
        isGuest: false
      }
    }
    
    return {
      userId: generateGuestId(),
      userName: 'Guest',
      isGuest: true
    }
  }
  
  /**
   * Gets or creates a guest ID from cookies for a specific draft
   */
  export function getOrCreateDraftGuestId(draftId: string, cookies: string | null): string {
    const cookieName = `draft_user_${draftId}`
    
    if (cookies) {
      const existingId = cookies
        .split(';')
        .find(c => c.trim().startsWith(`${cookieName}=`))
        ?.split('=')[1]
      
      if (existingId) {
        return existingId
      }
    }
    
    return generateGuestId()
  }
  
  /**
   * Creates a cookie string for storing guest ID (7 day expiry)
   */
  export function createGuestCookie(draftId: string, userId: string): string {
    const cookieName = `draft_user_${draftId}`
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 7)
    
    return `${cookieName}=${userId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`
  }
  
  /**
   * Middleware for draft WebSocket connections
   * Adds auth headers for both logged-in users and guests
   */
  export async function draftWebSocketMiddleware(
    request: Request, 
    ctx: any
  ): Promise<Request> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return request
    }
  
    const newHeaders = new Headers(request.headers)
    
    if (ctx.user?.id) {
      // Logged-in user - use their credentials
      newHeaders.set('X-Auth-User-Id', ctx.user.id)
      newHeaders.set('X-Auth-User-Name', ctx.user.name || ctx.user.email || 'Player')
      console.log('🔐 WebSocket auth: logged-in user', ctx.user.id)
    } else {
      // Guest user - read from cookie
      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const draftId = pathParts[pathParts.length - 1] // Last part is draft ID
      const cookies = request.headers.get('cookie')
      
      if (draftId) {
        const guestId = getOrCreateDraftGuestId(draftId, cookies)
        newHeaders.set('X-Auth-User-Id', guestId)
        newHeaders.set('X-Auth-User-Name', 'Guest')
        console.log('🍪 WebSocket auth: guest user', guestId)
      } else {
        console.warn('⚠️ WebSocket: No draft ID found in URL', url.pathname)
      }
    }
    
    // Create new request with auth headers
    return new Request(request.url, {
      method: request.method,
      headers: newHeaders,
    })
  }