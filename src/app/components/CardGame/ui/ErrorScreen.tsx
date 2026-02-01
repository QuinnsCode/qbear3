// app/components/CardGame/ui/ErrorScreen.tsx

interface ErrorScreenProps {
    error: string
  }
  
  export function ErrorScreen({ error }: ErrorScreenProps) {
    return (
      <div className="h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Reconnect
          </button>
        </div>
      </div>
    )
  }