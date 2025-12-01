// src/app/lib/cardGame/deckListParser.ts

import type { DeckListParseResult } from '@/app/types/Deck'

/**
 * Parse a deck list from various text formats:
 * - "1x Card Name" or "1 Card Name"
 * - "Card Name" (assumes quantity 1)
 * - Commander indicated by "Commander:" line
 * 
 * COMMANDER FORMAT RULES:
 * - 100 cards total (including commander)
 * - Commander can be specified via "Commander:" line
 * - If commander is in "Commander:" line but not in deck list, it will be added automatically
 * - Parser will ensure exactly 100 cards total
 */
export function parseDeckList(deckListText: string): DeckListParseResult {
  const lines = deckListText.split('\n').map(line => line.trim()).filter(Boolean)
  const cards: Array<{ quantity: number; name: string }> = []
  const errors: string[] = []
  let commander: string | undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip comments
    if (line.startsWith('//') || line.startsWith('#')) continue

    // Check for commander marker
    if (line.toLowerCase().startsWith('commander:')) {
      const commanderName = line.substring(10).trim()
      if (commanderName) {
        commander = commanderName
      }
      continue // Skip to next line
    }

    // Parse quantity and card name
    // Formats: "4x Lightning Bolt", "4 Lightning Bolt", "Lightning Bolt"
    const match = line.match(/^(\d+)\s*x?\s+(.+)$/i)
    
    if (match) {
      const quantity = parseInt(match[1])
      const name = match[2].trim()
      
      if (quantity > 0 && name) {
        cards.push({ quantity, name })
      } else {
        errors.push(`Line ${i + 1}: Invalid format - "${line}"`)
      }
    } else {
      // No quantity specified, assume 1
      const name = line.trim()
      if (name) {
        cards.push({ quantity: 1, name })
      }
    }
  }

  // Validate commander was specified
  if (!commander) {
    errors.push(`No commander specified. Deck list must include a "Commander: [Card Name]" line.`)
  }

  // If commander was specified, add it to the card list (it should NOT be in the 99)
  if (commander) {
    const commanderInList = cards.some(card => 
      card.name.toLowerCase() === commander.toLowerCase()
    )
    
    if (commanderInList) {
      errors.push(`Commander "${commander}" should not be in the main deck list. The "Commander:" line is separate from the 99 cards.`)
    } else {
      // Add commander to the beginning of the list
      cards.unshift({ quantity: 1, name: commander })
      console.log(`[Parser] Added commander "${commander}" to card list`)
    }
  }

  // Validate total count - should be exactly 99 cards in the list (commander is added separately)
  const listCardCount = cards.reduce((sum, card) => sum + card.quantity, 0) - (commander ? 1 : 0)
  
  if (listCardCount !== 99) {
    errors.push(`Deck list should contain exactly 99 cards (found ${listCardCount}). Commander is specified separately with "Commander: [Card Name]".`)
  }

  return { cards, commander, errors }
}

/**
 * Example deck list formats supported:
 * 
 * Format 1 - Commander separate (Moxfield style):
 * ```
 * Commander: Atraxa, Praetors' Voice
 * 1 Sol Ring
 * 1 Command Tower
 * 4x Forest
 * ... (99 cards total)
 * ```
 * Parser will add the commander to make 100 cards.
 * 
 * Format 2 - Commander in list:
 * ```
 * 1 Atraxa, Praetors' Voice
 * 1 Sol Ring
 * 1 Command Tower
 * ... (100 cards total)
 * ```
 * 
 * Format 3 - Simple list (assumes 1 of each):
 * ```
 * Atraxa, Praetors' Voice
 * Sol Ring
 * Command Tower
 * ```
 */