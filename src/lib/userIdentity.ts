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

