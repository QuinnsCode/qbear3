// app/lib/auth/cookieUtils.ts

const COOKIE_EXPIRY_DAYS = 30

/**
 * Persists user ID in a cookie for session continuity
 */
export function persistUserIdCookie(
  userId: string,
  cardGameId: string,
  isSandbox: boolean
): void {
  const cookieName = isSandbox ? `sandbox_user_${cardGameId}` : 'spectator_user'
  
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS)
  
  document.cookie = `${cookieName}=${userId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`
  
  console.log('Saved/updated user ID to cookie:', userId)
}