// app/components/CardGame/ui/LoadingScreen.tsx

export function LoadingScreen() {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-xl">Loading game...</p>
        </div>
      </div>
    )
}