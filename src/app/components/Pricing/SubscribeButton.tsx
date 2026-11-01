// app/components/Pricing/SubscribeButton.tsx
'use client'

import { useState } from 'react'
import { FantasyButton } from "@/app/components/theme/FantasyTheme"

export function SubscribeButton({ 
  tier, 
  isCurrent, 
  isLoggedIn, 
  userId,
  isPro 
}: { 
  tier: string
  isCurrent: boolean
  isLoggedIn: boolean
  userId?: string
  isPro: boolean
}) {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSubscribe = async () => {
    if (!isLoggedIn || !userId) {
      window.location.href = '/user/login?redirect=/pricing'
      return
    }
    
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          tier: tier as 'starter' | 'pro' 
        }),
      })
      
      const data: unknown = await response.json()
      const url = typeof data === 'object' && data !== null && 'url' in data && typeof data.url === 'string' ? data.url : null
      
      if (url) {
        window.location.href = url
      } else {
        const error = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : null
        alert(error || 'Failed to create checkout session')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout')
      setIsLoading(false)
    }
  }
  
  if (isCurrent) {
    return (
      <FantasyButton variant="secondary" className="w-full opacity-75 cursor-not-allowed">
        <span className="block w-full py-2">
          ✓ Your Current Path
        </span>
      </FantasyButton>
    )
  }
  
  return (
    <FantasyButton 
      variant={isPro ? "magic" : "primary"} 
      className="w-full"
      onClick={handleSubscribe}
      disabled={isLoading}
    >
      <span className="block w-full py-2">
        {isLoading ? '⏳ Loading...' : isLoggedIn ? `⚔️ Claim ${isPro ? 'Pro' : 'Starter'}` : '🛡️ Sign Up First'}
      </span>
    </FantasyButton>
  )
}