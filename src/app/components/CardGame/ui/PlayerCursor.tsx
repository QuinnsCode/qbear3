// app/components/CardGame/ui/PlayerCursor.tsx

interface PlayerCursorProps {
    player: {
      name: string
      cursorColor: string
    }
    x: number
    y: number
  }
  
  export function PlayerCursor({ player, x, y }: PlayerCursorProps) {
    return (
      <div
        className="fixed pointer-events-none z-50"
        style={{ left: x, top: y }}
      >
        <div className="text-2xl" style={{ color: player.cursorColor }}>
          👆
        </div>
        <div 
          className="text-xs mt-1 px-1 rounded whitespace-nowrap"
          style={{ 
            backgroundColor: player.cursorColor,
            color: 'white'
          }}
        >
          {player.name}
        </div>
      </div>
    )
  }