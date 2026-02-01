// app/components/CardGame/ui/PlayerNotFoundScreen.tsx

interface PlayerNotFoundScreenProps {
    playerId: string
  }
  
  export function PlayerNotFoundScreen({ playerId }: PlayerNotFoundScreenProps) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <p className="text-red-400">Player not found</p>
          <p className="text-sm mt-2">ID: {playerId}</p>
        </div>
      </div>
    )
  }