// app/components/CardGame/ui/DeckImportOverlay.tsx

interface DeckImportStatus {
    loading: boolean
    error: string | null
    step: string
  }
  
  interface DeckImportOverlayProps {
    status: DeckImportStatus
    onDismissError?: () => void
  }
  
  export function DeckImportOverlay({ status, onDismissError }: DeckImportOverlayProps) {
    if (status.loading) {
      return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
            <div className="animate-spin text-6xl">⚙️</div>
            <div className="text-white text-xl font-bold text-center">{status.step}</div>
          </div>
        </div>
      )
    }
  
    if (status.error) {
      return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-red-900 border-2 border-red-500 rounded-xl p-6 max-w-md">
            <div className="text-6xl mb-4 text-center">❌</div>
            <div className="text-white text-xl font-bold mb-2 text-center">Import Failed</div>
            <div className="text-red-200 text-sm mb-4 text-center">{status.error}</div>
            <button
              onClick={onDismissError}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )
    }
  
    return null
  }