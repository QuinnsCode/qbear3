// app/components/CardGame/ManaSymbols/ManaSymbols.tsx
'use client'

interface Props {
  manaCost: string
  size?: number
}

export default function ManaSymbols({ manaCost, size = 16 }: Props) {
  if (!manaCost) return null

  const symbols = manaCost.match(/\{([^}]+)\}/g)?.map(s => s.replace(/[{}]/g, '')) || []

  // Sprite sheet has 10 columns, 7 rows
  // Each symbol in the sprite is 104px × 104px
  const SPRITE_COLS = 10
  const SPRITE_SYMBOL_SIZE = 104 // Original size of each symbol in the sprite

  // Map symbols to sprite positions (row, col)
  const symbolPositions: Record<string, [number, number]> = {
    '0': [0, 0], '1': [0, 1], '2': [0, 2], '3': [0, 3], '4': [0, 4],
    '5': [0, 5], '6': [0, 6], '7': [0, 7], '8': [0, 8], '9': [0, 9],
    '10': [1, 0], '11': [1, 1], '12': [1, 2], '13': [1, 3], '14': [1, 4],
    '15': [1, 5], '16': [1, 6], '17': [1, 7], '18': [1, 8], '19': [1, 9],
    '20': [2, 0], 'X': [2, 1], 'Y': [2, 2], 'Z': [2, 3],
    'W': [2, 4],  // White sun
    'U': [2, 5],  // Blue water drop
    'B': [2, 6],  // Black skull
    'R': [2, 7],  // Red flame
    'G': [2, 8],  // Green tree
    'C': [2, 9],  // Colorless diamond
    // Hybrid mana
    'W/U': [3, 0], 'W/B': [3, 1], 'U/B': [3, 2], 'U/R': [3, 3], 'B/R': [3, 4],
    'B/G': [3, 5], 'R/W': [3, 6], 'R/G': [3, 7], 'G/W': [3, 8], 'G/U': [3, 9],
    // 2/color hybrid
    '2/W': [4, 0], '2/U': [4, 1], '2/B': [4, 2], '2/R': [4, 3], '2/G': [4, 4],
    // Phyrexian
    'W/P': [4, 5], 'U/P': [4, 6], 'B/P': [4, 7], 'R/P': [4, 8], 'G/P': [4, 9],
    'P': [4, 5], // Generic phyrexian
    // Special symbols
    'T': [5, 1],  // Tap
    'Q': [5, 0],  // Untap
    'S': [5, 6],  // Snow
    'E': [5, 3],  // Energy
  }

  return (
    <div className="inline-flex items-center gap-0.5">
      {symbols.map((symbol, i) => {
        const pos = symbolPositions[symbol] || symbolPositions[symbol.toUpperCase()] || [0, 0]
        const [row, col] = pos
        
        // Calculate the scale factor to resize sprite symbols to our desired size
        const scale = size / SPRITE_SYMBOL_SIZE
        
        // Background size = sprite width × scale
        const bgWidth = SPRITE_COLS * SPRITE_SYMBOL_SIZE * scale
        
        return (
            <div
            key={i}
            className="flex-shrink-0 bg-slate-900 rounded-full overflow-hidden"
            style={{
              width: size,
              height: size,
              backgroundImage: 'url(/mana-symbols-sprite.png)',
              backgroundSize: `${bgWidth}px auto`,
              backgroundPosition: `-${col * size}px -${row * size}px`,
              backgroundRepeat: 'no-repeat',
            }}
            title={`{${symbol}}`}
          />
        )
      })}
    </div>
  )
}