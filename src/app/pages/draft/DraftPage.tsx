// app/pages/draft/DraftPage.tsx
import { Suspense } from 'react'
import { type RequestInfo } from "rwsdk/worker"
import { env } from "cloudflare:workers"
import DraftContent from '@/app/components/Draft/DraftContent'

export default async function DraftPage({ params, ctx, request }: RequestInfo) {
  const draftId = params.draftId
  
  console.log('🎴 Draft Page - ctx.user:', ctx.user)
  
  let userId: string
  let userName: string
  let isLoggedIn: boolean

  if (ctx.user?.id) {
    userId = ctx.user.id
    userName = ctx.user.name || ctx.user.email || 'Player'
    isLoggedIn = true
  } else {
    // Generate guest ID
    const cookieName = `draft_user_${draftId}`
    const existingId = request.headers.get('cookie')
      ?.split(';')
      .find(c => c.trim().startsWith(`${cookieName}=`))
      ?.split('=')[1]
    
    if (existingId) {
      userId = existingId
      userName = 'Guest'
      console.log('🍪 Using existing cookie ID:', userId)
    } else {
      userId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      userName = 'Guest'
      console.log('🆕 Generated new guest ID:', userId)
    }
    
    isLoggedIn = false
  }

  if (!env?.DRAFT_DO) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-600">DRAFT_DO binding not found.</p>
        </div>
      </div>
    )
  }

  // Fetch initial draft state
  const id = env.DRAFT_DO.idFromName(draftId)
  const stub = env.DRAFT_DO.get(id)
  
  let initialState = null
  let error = null
  
  try {
    const response = await stub.fetch(new Request('https://fake-host/', {
      method: 'GET'
    }))
    
    if (response.ok) {
      initialState = await response.json()
    } else {
      error = 'Draft not found'
    }
  } catch (e: any) {
    console.error('Error loading draft:', e)
    error = e.message
  }
  
  if (error || !initialState) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-400 mb-4">❌ {error || 'Draft not found'}</h1>
          <a href="/draft/new" className="text-blue-400 hover:underline text-lg">
            Start a new draft
          </a>
        </div>
      </div>
    )
  }

  return (
    <DraftContent 
      draftId={draftId}
      initialState={initialState}
      userId={userId}
      userName={userName}
      isLoggedIn={isLoggedIn}
    />
  )
}