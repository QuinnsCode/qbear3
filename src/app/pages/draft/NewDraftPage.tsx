// app/pages/draft/NewDraftPage.tsx
import { type RequestInfo } from "rwsdk/worker"
import NewDraftForm from '@/app/components/Draft/NewDraftForm'
import { getUserIdentity } from '@/lib/userIdentity'


export default async function NewDraftPage({ ctx }: RequestInfo) {
  const { userId, userName, isGuest } = getUserIdentity(ctx)

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Start New Draft</h1>
          <p className="text-slate-400 text-lg">
            Draft against AI opponents and build your deck from the MTGO Vintage Cube
          </p>
        </div>
        
        <NewDraftForm 
          userId={userId}
          userName={userName}
          isGuest={isGuest}
        />
        
        {!ctx.user && (
          <div className="mt-8 bg-blue-900/30 border border-blue-500/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">💡 Guest Mode</h3>
            <p className="text-slate-300">
              You're drafting as a guest. Your draft progress will be saved for 7 days.
            </p>
            <div className="mt-4 flex gap-4">
              <a 
                href="/user/signup" 
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Sign up
              </a>
              <a 
                href="/user/login" 
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Log in
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}