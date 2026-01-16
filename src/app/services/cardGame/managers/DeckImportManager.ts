// src/app/services/cardGame/managers/DeckImportManager.ts
import type { 
  CardGameState, 
  MTGPlayer, 
  Card, 
  ScryfallCard,
  CardGameAction 
} from '@/app/services/cardGame/CardGameState'
import { parseDeckList } from '@/app/lib/cardGame/deckListParser'

/**
 * DeckImportManager - Handles deck importing and card creation
 * 
 * Parses deck lists and creates card instances from the parsed data
 */
export class DeckImportManager {
  
  /**
   * Import a deck for a player
   * Creates card instances and adds them to the player's library
   * 
   * IMPORTANT: This will CLEAR all existing zones for the player
   */
  static importDeck(gameState: CardGameState, action: CardGameAction): CardGameState {
      const player = gameState.players.find(p => p.id === action.playerId)
      if (!player) {
        console.error('Player not found:', action.playerId)
        return gameState
      }
      
      console.log(`📦 Importing deck for ${player.name}...`)
      
      const deckListText = action.data.deckListText || ''
      
      // Parse the deck list
      const parseResult = parseDeckList(deckListText)
      
      if (parseResult.errors.length > 0) {
        console.error('Deck list parse errors:', parseResult.errors)
        return gameState
      }
      
      console.log(`📋 Parsed deck: ${parseResult.cards.length} unique cards, ${parseResult.cards.reduce((sum, c) => sum + c.quantity, 0)} total`)
      console.log(`👑 Commander: ${parseResult.commander || 'None'}`)
      
      // CRITICAL: Remove all existing cards for this player from game state
      console.log(`🧹 Clearing existing cards for ${player.name}...`)
      const updatedCards: Record<string, Card> = {}
      
      // Keep cards that don't belong to this player
      Object.keys(gameState.cards).forEach(cardId => {
        const card = gameState.cards[cardId]
        if (card.ownerId !== action.playerId) {
          updatedCards[cardId] = card
        }
      })
      
      console.log(`✅ Removed ${Object.keys(gameState.cards).length - Object.keys(updatedCards).length} old cards`)
      
      // Create new card instances from parsed deck
      const newCards: Card[] = []
      const scryfallIds: string[] = []
      const cardDataMap = new Map<string, ScryfallCard>()
      
      // UPDATED: Use card data from action if provided, otherwise fall back to player's deck list
      const cardDataSource = action.data.cardData || player.deckList?.cardData || []
      
      cardDataSource.forEach((cardData: any) => {
        // Store by full name
        cardDataMap.set(cardData.name.toLowerCase(), cardData)
        
        // For MDFCs (Modal Double-Faced Cards), also store by front face name only
        // e.g., "Emeria's Call // Emeria, Shattered Skyclave" → "emeria's call"
        if (cardData.name.includes(' // ')) {
          const frontFace = cardData.name.split(' // ')[0].trim()
          cardDataMap.set(frontFace.toLowerCase(), cardData)
        }
      })
      
      console.log(`📚 Loaded ${cardDataMap.size} card definitions`)
      
      for (const { name, quantity } of parseResult.cards) {
        // Find the card data (case-insensitive)
        const cardData = cardDataMap.get(name.toLowerCase())
        
        if (!cardData) {
          console.warn(`⚠️ Card data not found for: ${name}`)
          continue
        }
        
        // Create the specified number of copies
        for (let i = 0; i < quantity; i++) {
          const instanceId = `${action.playerId}-${cardData.id}-${i}-${crypto.randomUUID()}`
          
          const card: Card = {
            instanceId,
            scryfallId: cardData.id,
            ownerId: action.playerId,
            zone: 'library',
            position: { x: 0, y: 0 },
            rotation: 0,
            isFaceUp: false
          }
          
          newCards.push(card)
          scryfallIds.push(cardData.id)
        }
      }
      
      console.log(`✅ Created ${newCards.length} card instances`)
      
      // Shuffle the cards
      const shuffled = this.shuffleArray([...newCards])

      // Separate commander from library
      let commanderCards: string[] = []
      let libraryCards: string[] = []

      if (parseResult.commander) {
          const commanderName = parseResult.commander.toLowerCase()
          const commanderCardData = cardDataMap.get(commanderName)
          
          const commanderCard = commanderCardData 
            ? shuffled.find(card => card.scryfallId === commanderCardData.id)
            : undefined
      
          if (commanderCard) {
              commanderCard.zone = 'command'
              commanderCard.isFaceUp = true
              commanderCards = [commanderCard.instanceId]
              libraryCards = shuffled.filter(c => c.instanceId !== commanderCard.instanceId).map(c => c.instanceId)
          } else {
              libraryCards = shuffled.map(c => c.instanceId)
          }
      } else {
          libraryCards = shuffled.map(c => c.instanceId)
      }
      
      // Add new cards to game state
      shuffled.forEach(card => {
        updatedCards[card.instanceId] = card
      })
      
      // Update player with cleared zones and new library
      const updatedPlayers = gameState.players.map(p => {
        if (p.id === action.playerId) {
          return {
            ...p,
            deckList: {
              raw: deckListText,
              deckName: action.data.deckName || (parseResult.commander ? `${parseResult.commander} Commander` : 'Custom Deck'),
              scryfallIds,
              cardData: Array.from(cardDataMap.values())
            },
            zones: {
              hand: [],
              library: libraryCards,  // 99 cards
              graveyard: [],
              exile: [],
              battlefield: [],
              command: commanderCards  // 1 commander
            }
          }
        }
        return p
      })
      
      console.log(`✅ Deck imported: ${newCards.length} cards added to ${player.name}'s library`)
      console.log(`✅ All zones cleared for fresh start`)
      
      return {
        ...gameState,
        cards: updatedCards,
        players: updatedPlayers
      }
  }

  /**
   * Import a sandbox starter deck using pre-loaded deck data
   * This avoids passing large card data through the action
   */
  static importSandboxDeck(
    gameState: CardGameState, 
    action: CardGameAction,
    starterDecks: any[]
  ): CardGameState {
    const deckIndex = action.data.deckIndex;
    const assignedDeck = starterDecks[deckIndex % starterDecks.length];
    
    if (!assignedDeck) {
      console.error(`❌ Sandbox deck ${deckIndex} not found`);
      return gameState;
    }
    
    console.log(`📦 Importing sandbox deck: ${assignedDeck.name}`);
    
    // Convert to regular import action with full card data
    const importAction: CardGameAction = {
      ...action,
      type: 'import_deck',
      data: {
        deckListText: assignedDeck.deckList,
        deckName: assignedDeck.name,
        cardData: assignedDeck.cards
      }
    };
    
    return this.importDeck(gameState, importAction);
  }
  
  /**
   * Shuffle an array (Fisher-Yates algorithm)
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}