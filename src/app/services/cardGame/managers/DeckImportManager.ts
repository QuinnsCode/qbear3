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
        
        // Check if this is the test deck trigger
        if (deckListText === 'Test Deck') {
          return this.importTestDeck(gameState, action)
        }
        
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
        
        cardDataSource.forEach((cardData: ScryfallCard) => {
          cardDataMap.set(cardData.id, cardData)
        })
        
        console.log(`📚 Loaded ${cardDataMap.size} card definitions`)
        
        for (const { name, quantity } of parseResult.cards) {
          // Find the card data (case-insensitive)
          const cardData = Array.from(cardDataMap.values()).find(
            c => c.name.toLowerCase() === name.toLowerCase()
          )
          
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
            const commanderCard = shuffled.find(card => {
            const cardData = cardDataMap.get(card.scryfallId)
            return cardData?.name.toLowerCase() === commanderName
        })
        
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
     * Import test deck (60 test cards for quick testing)
     */
    private static importTestDeck(gameState: CardGameState, action: CardGameAction): CardGameState {
      const player = gameState.players.find(p => p.id === action.playerId)
      if (!player) return gameState
      
      console.log(`📦 Importing TEST deck for ${player.name}...`)
      
      // Hardcoded test cards (10 different cards, 6 copies each = 60 total)
      const TEST_CARDS: ScryfallCard[] = [
        {
          id: 'test-lightning-bolt',
          name: 'Lightning Bolt',
          mana_cost: '{R}',
          type_line: 'Instant',
          oracle_text: 'Lightning Bolt deals 3 damage to any target.',
          colors: ['R'],
          color_identity: ['R'],
          set: 'TEST',
          set_name: 'Test Set',
          collector_number: '1',
          rarity: 'common',
          image_uris: {
            small: 'https://cards.scryfall.io/small/front/c/e/ce711943-c1a1-43a0-8b89-8d169cfb8e06.jpg',
            normal: 'https://cards.scryfall.io/normal/front/c/e/ce711943-c1a1-43a0-8b89-8d169cfb8e06.jpg',
            large: 'https://cards.scryfall.io/large/front/c/e/ce711943-c1a1-43a0-8b89-8d169cfb8e06.jpg'
          }
        },
        {
          id: 'test-counterspell',
          name: 'Counterspell',
          mana_cost: '{U}{U}',
          type_line: 'Instant',
          oracle_text: 'Counter target spell.',
          colors: ['U'],
          color_identity: ['U'],
          set: 'TEST',
          set_name: 'Test Set',
          collector_number: '2',
          rarity: 'common',
          image_uris: {
            small: 'https://cards.scryfall.io/small/front/1/9/1920dae4-fb92-4f19-ae4b-eb3276b8dac7.jpg',
            normal: 'https://cards.scryfall.io/normal/front/1/9/1920dae4-fb92-4f19-ae4b-eb3276b8dac7.jpg',
            large: 'https://cards.scryfall.io/large/front/1/9/1920dae4-fb92-4f19-ae4b-eb3276b8dac7.jpg'
          }
        },
        {
          id: 'test-giant-growth',
          name: 'Giant Growth',
          mana_cost: '{G}',
          type_line: 'Instant',
          oracle_text: 'Target creature gets +3/+3 until end of turn.',
          colors: ['G'],
          color_identity: ['G'],
          set: 'TEST',
          set_name: 'Test Set',
          collector_number: '3',
          rarity: 'common',
          image_uris: {
            small: 'https://cards.scryfall.io/large/front/0/6/06ec9e8b-4bd8-4caf-a559-6514b7ab4ca4.jpg',
            normal: 'https://cards.scryfall.io/large/front/0/6/06ec9e8b-4bd8-4caf-a559-6514b7ab4ca4.jpg',
            large: 'https://cards.scryfall.io/large/front/0/6/06ec9e8b-4bd8-4caf-a559-6514b7ab4ca4.jpg'
          }
        },
        {
          id: 'test-dark-ritual',
          name: 'Dark Ritual',
          mana_cost: '{B}',
          type_line: 'Instant',
          oracle_text: 'Add {B}{B}{B}.',
          colors: ['B'],
          color_identity: ['B'],
          set: 'TEST',
          set_name: 'Test Set',
          collector_number: '4',
          rarity: 'common',
          image_uris: {
            small: 'https://cards.scryfall.io/small/front/9/5/95f27eeb-6f14-4db3-adb9-9be5ed76b34b.jpg',
            normal: 'https://cards.scryfall.io/normal/front/9/5/95f27eeb-6f14-4db3-adb9-9be5ed76b34b.jpg',
            large: 'https://cards.scryfall.io/large/front/9/5/95f27eeb-6f14-4db3-adb9-9be5ed76b34b.jpg'
          }
        },
        {
          id: 'test-swords-to-plowshares',
          name: 'Swords to Plowshares',
          mana_cost: '{W}',
          type_line: 'Instant',
          oracle_text: 'Exile target creature. Its controller gains life equal to its power.',
          colors: ['W'],
          color_identity: ['W'],
          set: 'TEST',
          set_name: 'Test Set',
          collector_number: '5',
          rarity: 'uncommon',
          image_uris: {
            small: 'https://cards.scryfall.io/large/front/b/e/be0bda98-e3f7-4a9e-b05d-5f8529e762ab.jpg',
            normal: 'https://cards.scryfall.io/large/front/b/e/be0bda98-e3f7-4a9e-b05d-5f8529e762ab.jpg',
            large: 'https://cards.scryfall.io/large/front/b/e/be0bda98-e3f7-4a9e-b05d-5f8529e762ab.jpg'
          }
        },
        {
          id: 'test-grizzly-bears',
          name: 'Grizzly Bears',
          mana_cost: '{1}{G}',
          type_line: 'Creature — Bear',
          oracle_text: '',
          power: '2',
          toughness: '2',
          colors: ['G'],
          color_identity: ['G'],
          set: 'TEST',
          set_name: 'Test Set',
          collector_number: '6',
          rarity: 'common',
          image_uris: {
            small: 'https://cards.scryfall.io/small/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.jpg',
            normal: 'https://cards.scryfall.io/normal/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.jpg',
            large: 'https://cards.scryfall.io/large/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.jpg'
          }
        },
        {
          id: 'test-llanowar-elves',
          name: 'Llanowar Elves',
          mana_cost: '{G}',
          type_line: 'Creature — Elf Druid',
          oracle_text: '{T}: Add {G}.',
          power: '1',
          toughness: '1',
          colors: ['G'],
          color_identity: ['G'],
          set: 'TEST',
          set_name: 'Test Set',
          collector_number: '7',
          rarity: 'common',
          image_uris: {
            small: 'https://cards.scryfall.io/large/front/5/8/581b7327-3215-4a4f-b4ae-d9d4002ba882.jpg',
            normal: 'https://cards.scryfall.io/large/front/5/8/581b7327-3215-4a4f-b4ae-d9d4002ba882.jpg',
            large: 'https://cards.scryfall.io/large/front/5/8/581b7327-3215-4a4f-b4ae-d9d4002ba882.jpg'
          }
        },
        {
          id: 'test-serra-angel',
          name: 'Serra Angel',
          mana_cost: '{3}{W}{W}',
          type_line: 'Creature — Angel',
          oracle_text: 'Flying, vigilance',
          power: '4',
          toughness: '4',
          colors: ['W'],
          color_identity: ['W'],
          set: 'TEST',
          set_name: 'Test Set',
          collector_number: '8',
          rarity: 'uncommon',
          image_uris: {
            small: 'https://cards.scryfall.io/large/front/9/7/97fa5f07-46ba-408d-a861-bdb1791cc188.jpg',
            normal: 'https://cards.scryfall.io/large/front/9/7/97fa5f07-46ba-408d-a861-bdb1791cc188.jpg',
            large: 'https://cards.scryfall.io/large/front/9/7/97fa5f07-46ba-408d-a861-bdb1791cc188.jpg'
          }
        },
        {
          id: 'test-shivan-dragon',
          name: 'Shivan Dragon',
          mana_cost: '{4}{R}{R}',
          type_line: 'Creature — Dragon',
          oracle_text: 'Flying, {R}: Shivan Dragon gets +1/+0 until end of turn.',
          power: '5',
          toughness: '5',
          colors: ['R'],
          color_identity: ['R'],
          set: 'TEST',
          set_name: 'Test Set',
          collector_number: '9',
          rarity: 'rare',
          image_uris: {
            small: 'https://cards.scryfall.io/small/front/2/2/227cf1b5-f85b-41fe-be98-66e383652039.jpg',
            normal: 'https://cards.scryfall.io/normal/front/2/2/227cf1b5-f85b-41fe-be98-66e383652039.jpg',
            large: 'https://cards.scryfall.io/large/front/2/2/227cf1b5-f85b-41fe-be98-66e383652039.jpg'
          }
        },
        {
          id: 'test-sol-ring',
          name: 'Sol Ring',
          mana_cost: '{1}',
          type_line: 'Artifact',
          oracle_text: '{T}: Add {C}{C}.',
          colors: [],
          color_identity: [],
          set: 'TEST',
          set_name: 'Test Set',
          collector_number: '10',
          rarity: 'uncommon',
          image_uris: {
            small: 'https://cards.scryfall.io/large/front/8/3/835df088-5860-46b1-9c4d-3607d0293963.jpg',
            normal: 'https://cards.scryfall.io/large/front/8/3/835df088-5860-46b1-9c4d-3607d0293963.jpg',
            large: 'https://cards.scryfall.io/large/front/8/3/835df088-5860-46b1-9c4d-3607d0293963.jpg'
          }
        }
      ]
      
      // Clear existing cards for this player
      const updatedCards: Record<string, Card> = {}
      Object.keys(gameState.cards).forEach(cardId => {
        const card = gameState.cards[cardId]
        if (card.ownerId !== action.playerId) {
          updatedCards[cardId] = card
        }
      })
      
      // Create test card instances
      const newCards: Card[] = []
      const scryfallIds: string[] = []
      
      for (const testCard of TEST_CARDS) {
        for (let i = 0; i < 6; i++) {
          const instanceId = `${action.playerId}-${testCard.id}-${i}-${crypto.randomUUID()}`
          
          const card: Card = {
            instanceId,
            scryfallId: testCard.id,
            ownerId: action.playerId,
            zone: 'library',
            position: { x: 0, y: 0 },
            rotation: 0,
            isFaceUp: false
          }
          
          newCards.push(card)
          scryfallIds.push(testCard.id)
        }
      }
      
      const shuffled = this.shuffleArray([...newCards])
      
      shuffled.forEach(card => {
        updatedCards[card.instanceId] = card
      })
      
      const updatedPlayers = gameState.players.map(p => {
        if (p.id === action.playerId) {
          return {
            ...p,
            deckList: {
              raw: 'Test Deck - 60 cards',
              deckName: 'Test Deck',
              scryfallIds,
              cardData: TEST_CARDS
            },
            zones: {
              hand: [],
              library: shuffled.map(c => c.instanceId),
              graveyard: [],
              exile: [],
              battlefield: [],
              command: []
            }
          }
        }
        return p
      })
      
      return {
        ...gameState,
        cards: updatedCards,
        players: updatedPlayers
      }
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