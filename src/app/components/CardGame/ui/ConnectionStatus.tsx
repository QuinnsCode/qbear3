// app/components/CardGame/ui/ConnectionStatus.tsx

interface ConnectionStatusProps {
    isConnected: boolean
  }
  
  export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
    return (
      <div className="flex items-center gap-2 bg-black/50 px-3 py-2 mr-2 rounded-full">
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`} />
      </div>
    )
  }