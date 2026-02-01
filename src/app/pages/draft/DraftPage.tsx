// app/pages/draft/DraftPage.tsx
import { type RequestInfo } from "rwsdk/worker"
import { env } from "cloudflare:workers"
import DraftContent from '@/app/components/Draft/DraftContent'
import { getOrCreateDraftGuestId } from '@/lib/userIdentity'
import type { Region } from '@/app/lib/constants/regions'

export default async function DraftPage({ params, ctx, request }: RequestInfo) {
  const draftId = params.draftId

  // Extract PVP params from URL
  const url = new URL(request.url)
  const pvpRegion = url.searchParams.get('pvpRegion') as Region | undefined
  const returnTo = url.searchParams.get('returnTo') || undefined
  
  console.log('🎴 Draft Page - ctx.user:', ctx.user)
  
  let userId: string
  let userName: string
  let isLoggedIn: boolean

  if (ctx.user?.id) {
    userId = ctx.user.id
    userName = ctx.user.name || ctx.user.email || 'Player'
    isLoggedIn = true
  } else {
    // Get or create guest ID from cookie
    const cookies = request.headers.get('cookie')
    userId = getOrCreateDraftGuestId(draftId, cookies)
    userName = 'Guest'
    isLoggedIn = false
    console.log('🍪 Guest user ID:', userId)
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
      pvpRegion={pvpRegion}
      returnTo={returnTo}
    />
  )
}