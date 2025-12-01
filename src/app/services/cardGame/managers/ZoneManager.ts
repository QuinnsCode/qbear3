// src/app/services/cardGame/managers/ZoneManager.ts
import type { CardGameState, CardGameAction } from '@/app/services/cardGame/CardGameState'

/**
 * ZoneManager - ULTRA VERBOSE DEBUG VERSION
 * This will tell us EXACTLY what's happening
 */
export class ZoneManager {
  
  static drawCards(gameState: CardGameState, action: CardGameAction): CardGameState {
    const player = gameState.players.find(p => p.id === action.playerId)
    if (!player) {
      console.error('Player not found:', action.playerId)
      return gameState
    }
    
    const count = action.data.count || 1
    
    if (player.zones.library.length < count) {
      console.error(`Cannot draw ${count} cards - only ${player.zones.library.length} in library`)
      return gameState
    }
    
    const drawnCardIds = player.zones.library.slice(0, count)
    const remainingLibrary = player.zones.library.slice(count)
    
    const updatedCards = { ...gameState.cards }
    drawnCardIds.forEach(cardId => {
      if (updatedCards[cardId]) {
        const { position, ...rest } = updatedCards[cardId]
        updatedCards[cardId] = {
          ...rest,
          zone: 'hand',
          isFaceUp: true,
          isTapped: false,
          rotation: 0
        }
      }
    })
    
    const updatedPlayers = gameState.players.map(p => {
      if (p.id === action.playerId) {
        return {
          ...p,
          zones: {
            ...p.zones,
            library: remainingLibrary,
            hand: [...p.zones.hand, ...drawnCardIds]
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
  
  static shuffleLibrary(gameState: CardGameState, action: CardGameAction): CardGameState {
    const player = gameState.players.find(p => p.id === action.playerId)
    if (!player) {
      console.error('Player not found:', action.playerId)
      return gameState
    }
    
    const shuffled = this.shuffleArray([...player.zones.library])
    
    const updatedPlayers = gameState.players.map(p => {
      if (p.id === action.playerId) {
        return {
          ...p,
          zones: {
            ...p.zones,
            library: shuffled
          }
        }
      }
      return p
    })
    
    return {
      ...gameState,
      players: updatedPlayers
    }
  }

  static millCards(gameState: CardGameState, action: CardGameAction): CardGameState {
    const player = gameState.players.find(p => p.id === action.playerId)
    if (!player) return gameState
  
    const count = Math.min(action.data.count || 1, player.zones.library.length)
    const milledCardIds = player.zones.library.slice(0, count)
    
    const updatedCards = { ...gameState.cards }
    milledCardIds.forEach(cardId => {
      if (updatedCards[cardId]) {
        const { position, ...rest } = updatedCards[cardId]
        updatedCards[cardId] = {
          ...rest,
          zone: 'graveyard',
          isFaceUp: true,
          isTapped: false,
          rotation: 0
        }
      }
    })
  
    const updatedPlayers = gameState.players.map(p => {
      if (p.id === action.playerId) {
        return {
          ...p,
          zones: {
            ...p.zones,
            library: p.zones.library.slice(count),
            graveyard: [...milledCardIds, ...p.zones.graveyard]
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
  
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * ULTRA VERBOSE VERSION - Shows EVERYTHING
   */
  static moveCardBetweenZones(gameState: CardGameState, action: CardGameAction): CardGameState {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔧 ZoneManager.moveCardBetweenZones START')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const { cardId, fromZone, toZone } = action.data
    
    console.log('📋 Action Data:')
    console.log('  cardId:', cardId)
    console.log('  fromZone:', fromZone)
    console.log('  toZone:', toZone)
    console.log('  playerId:', action.playerId)
    console.log('  full action.data:', action.data)
    
    // Find player
    console.log('\n🔍 Finding player...')
    const player = gameState.players.find(p => p.id === action.playerId)
    
    if (!player) {
      console.error('❌ FAILED: Player not found')
      console.error('  Looking for:', action.playerId)
      console.error('  Available players:', gameState.players.map(p => p.id))
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return gameState
    }
    
    console.log('✅ Player found:', player.name)
    
    // Find card
    console.log('\n🔍 Finding card...')
    const card = gameState.cards[cardId]
    
    if (!card) {
      console.error('❌ FAILED: Card not found')
      console.error('  Looking for:', cardId)
      console.error('  Available card IDs:', Object.keys(gameState.cards))
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return gameState
    }
    
    console.log('✅ Card found:', card.name)
    console.log('  Current zone:', card.zone)
    console.log('  Has position:', !!card.position)
    
    // Check zones
    console.log('\n🔍 Checking zones...')
    console.log('  Player zones:', {
      library: player.zones.library.length,
      hand: player.zones.hand.length,
      battlefield: player.zones.battlefield.length,
      graveyard: player.zones.graveyard.length,
      exile: player.zones.exile.length,
      command: player.zones.command.length
    })
    
    type ZoneType = keyof typeof player.zones
    const from = fromZone as ZoneType
    const to = toZone as ZoneType
    
    console.log(`  Source zone (${from}):`, player.zones[from])
    console.log(`  Destination zone (${to}):`, player.zones[to])
    
    // Validate card is in source zone
    const isInSourceZone = player.zones[from]?.includes(cardId)
    console.log(`  Is card in ${from}?`, isInSourceZone)
    
    if (!isInSourceZone) {
      console.error('❌ FAILED: Card not in source zone!')
      console.error(`  Expected to find ${cardId} in ${from}`)
      console.error(`  ${from} contains:`, player.zones[from])
      console.error('  Card current zone:', card.zone)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return gameState
    }
    
    console.log('✅ Card is in source zone')
    
    // Update card
    console.log('\n🔨 Updating card...')
    let updatedCard: any
    
    if (toZone === 'battlefield') {
      console.log('  Destination is battlefield - adding position')
      updatedCard = {
        ...card,
        zone: to,
        position: action.data.position || { x: 100, y: 50 },
        isFaceUp: action.data.isFaceUp !== undefined ? action.data.isFaceUp : true,
        isTapped: false,
        rotation: 0
      }
    } else {
      console.log('  Destination is NOT battlefield - removing position')
      const { position, ...rest } = card
      updatedCard = {
        ...rest,
        zone: to,
        isFaceUp: toZone === 'library' ? false : true,
        isTapped: false,
        rotation: 0
      }
    }
    
    console.log('✅ Card updated:')
    console.log('  zone:', updatedCard.zone)
    console.log('  isFaceUp:', updatedCard.isFaceUp)
    console.log('  has position:', !!updatedCard.position)
    console.log('  isTapped:', updatedCard.isTapped)
    
    // Update zones
    console.log('\n🔨 Updating player zones...')
    
    const newFromZone = player.zones[from].filter(id => id !== cardId)
    console.log(`  Removed from ${from}: ${player.zones[from].length} → ${newFromZone.length}`)
    
    let newToZone: string[]
    if (toZone === 'library' && action.data.toPosition) {
      if (action.data.toPosition === 'top') {
        newToZone = [cardId, ...player.zones[to]]
        console.log(`  Added to top of ${to}`)
      } else {
        newToZone = [...player.zones[to], cardId]
        console.log(`  Added to bottom of ${to}`)
      }
    } else if (toZone === 'graveyard') {
      newToZone = [cardId, ...player.zones[to]]
      console.log(`  Added to top of ${to} (most recent)`)
    } else {
      newToZone = [...player.zones[to], cardId]
      console.log(`  Added to end of ${to}`)
    }
    
    console.log(`  Added to ${to}: ${player.zones[to].length} → ${newToZone.length}`)
    
    const updatedPlayers = gameState.players.map(p => {
      if (p.id === action.playerId) {
        return {
          ...p,
          zones: {
            ...p.zones,
            [from]: newFromZone,
            [to]: newToZone
          }
        }
      }
      return p
    })
    
    console.log('✅ Player zones updated')
    
    // Create new state
    console.log('\n🔨 Creating new game state...')
    const newState = {
      ...gameState,
      cards: {
        ...gameState.cards,
        [cardId]: updatedCard
      },
      players: updatedPlayers,
      updatedAt: new Date()
    }
    
    console.log('✅ New state created')
    console.log('  Is new object?', newState !== gameState)
    console.log('  Is cards new object?', newState.cards !== gameState.cards)
    console.log('  Is players new object?', newState.players !== gameState.players)
    
    console.log('\n✅ SUCCESS - Move complete!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    return newState
  }
}