// app/components/CardGame/ui/SpectatorIndicator.tsx

export function SpectatorIndicator() {
    return (
      <div className="flex items-center gap-2 bg-purple-600/90 px-3 py-1 rounded-full">
        <span className="text-xl">👁️</span>
        <span className="text-sm font-semibold text-white">Spectator</span>
      </div>
    )
  }