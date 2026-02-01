// app/components/CardGame/ui/SpectatorBottomBar.tsx

export function SpectatorBottomBar() {
    return (
      <div className="bg-purple-900/50 rounded-b-lg flex items-center justify-center gap-3 py-4">
        <span className="text-purple-200">Spectator Mode - Read Only View</span>
        <a 
          href="/user/signup" 
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
        >
          Sign Up
        </a>
        <a 
          href="/user/login" 
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg border border-purple-500 transition-colors"
        >
          Log In
        </a>
      </div>
    )
  }