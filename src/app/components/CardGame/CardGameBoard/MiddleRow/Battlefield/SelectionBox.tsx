// @/app/src/components/CardGame/Battlefield/SelectionBox.tsx

'use client'

interface Props {
  box: {
    left: number
    top: number
    width: number
    height: number
  }
}

export function SelectionBox({ box }: Props) {
  return (
    <div
      className="absolute pointer-events-none border-2 border-amber-500 bg-amber-500/20 rounded-sm"
      style={{
        left: `${box.left}px`,
        top: `${box.top}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
        boxShadow: '0 0 20px rgba(251, 191, 36, 0.6), inset 0 0 20px rgba(251, 191, 36, 0.2)',
        animation: 'pulse 1.5s ease-in-out infinite'
      }}
    >
      {/* Corner accents - fire theme */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50" />
    </div>
  )
}