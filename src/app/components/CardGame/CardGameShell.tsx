export default function CardGameShell() {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col">
        <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-700 rounded animate-pulse" />
            <div className="w-32 h-6 bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="w-24 h-8 bg-slate-700 rounded animate-pulse" />
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-4">🎴</div>
            <h2 className="text-xl font-bold mb-4">Loading Game...</h2>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
            <p className="text-sm text-gray-400 mt-4">Connecting to game server...</p>
          </div>
        </div>
      </div>
    )
  }