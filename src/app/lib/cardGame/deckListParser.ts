// src/app/lib/cardGame/deckListParser.ts

import type { DeckListParseResult } from '@/app/types/Deck'

/**
 * Parse a deck list from various text formats:
 * - "1x Card Name" or "1 Card Name"
 * - "Card Name" (assumes quantity 1)
 * - Single commander: "Commander: Card Name"
 * - Partner commanders: "Commander: Card Name" and "Partner: Card Name"
 * 
 * COMMANDER FORMAT RULES:
 * - 100 cards total (including commander(s))
 * - Commander specified via "Commander:" line
 * - Partner commander specified via "Partner:" or second "Commander:" line
 * - Cards in list should total 100 including commander(s)
 */
export function parseDeckList(deckListText: string): DeckListParseResult {
  const lines = deckListText.split('\n').map(line => line.trim()).filter(Boolean)
  const cards: Array<{ quantity: number; name: string }> = []
  const errors: string[] = []
  const commanders: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip comments
    if (line.startsWith('//') || line.startsWith('#')) continue

    // Check for commander markers
    if (line.toLowerCase().startsWith('commander:')) {
      const commanderName = line.substring(10).trim()
      if (commanderName) {
        commanders.push(commanderName)
        console.log(`[Parser] Found commander: ${commanderName}`)
      }
      continue
    }

    // Check for partner marker (alternative to second "Commander:" line)
    if (line.toLowerCase().startsWith('partner:')) {
      const partnerName = line.substring(8).trim()
      if (partnerName) {
        commanders.push(partnerName)
        console.log(`[Parser] Found partner commander: ${partnerName}`)
      }
      continue
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

  // Validate commanders
  if (commanders.length === 0) {
    errors.push(
      `No commander specified. Add "Commander: [Card Name]" to your deck list.`
    )
  } else if (commanders.length > 2) {
    errors.push(
      `Too many commanders specified (${commanders.length}). ` +
      `Commander format allows 1 commander or 2 with Partner ability.`
    )
  }

  // Add commander(s) to the card list
  // This ensures they're counted in the total
  commanders.forEach(commanderName => {
    // Check if commander is already in the list
    const existingCard = cards.find(
      card => card.name.toLowerCase() === commanderName.toLowerCase()
    )
    
    if (existingCard) {
      // Commander is already in the list, that's fine
      console.log(`[Parser] Commander "${commanderName}" already in deck list`)
    } else {
      // Add commander to the beginning of the list
      cards.unshift({ quantity: 1, name: commanderName })
      console.log(`[Parser] Added commander "${commanderName}" to card list`)
    }
  })

  // Calculate total cards
  const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0)
  
  // Validate total is exactly 100 for Commander format
  if (totalCards !== 100) {
    errors.push(
      `Commander deck must have exactly 100 cards (including commander${commanders.length > 1 ? 's' : ''}). ` +
      `Found: ${totalCards} cards.`
    )
  }

  return { 
    cards, 
    commander: commanders[0], // Primary commander (backward compat)
    commanders: commanders, // ALWAYS return array (even if length 1)
    errors 
  }
}