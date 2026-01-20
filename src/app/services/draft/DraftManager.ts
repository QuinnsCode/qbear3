// app/services/draft/DraftManager.ts
import type { DraftState, DraftConfig, DraftPlayer, Pack, CubeCard } from '@/app/types/Draft'

export class DraftManager {
  
  static initializeDraft(
    cubeCards: CubeCard[], 
    config: DraftConfig,
    players: DraftPlayer[]
  ): DraftState {
    
    if (players.length < 2 || players.length > 8) {
      throw new Error('Booster draft requires 2-8 players')
    }
    
    const shuffled = this.shuffle([...cubeCards])
    
    // Store all shuffled cards for later rounds
    const allPacks = this.generateAllPacks(shuffled, config, players)
    
    // Assign first round packs
    const playersWithPacks = players.map((p, i) => ({
      ...p,
      currentPack: allPacks[0][i]
    }))
    
    return {
      id: crypto.randomUUID(),
      format: 'booster',
      config,
      status: 'drafting',
      players: playersWithPacks,
      currentRound: 0,
      currentPick: 0,
      createdAt: new Date(),
      remainingPacks: allPacks.slice(1) // Store rounds 2 and 3
    } as DraftState & { remainingPacks: Pack[][] }
  }
  
  private static generateAllPacks(shuffled: CubeCard[], config: DraftConfig, players: DraftPlayer[]): Pack[][] {
    const allRounds: Pack[][] = []
    let cardIndex = 0
    
    for (let round = 0; round < config.packsPerPlayer; round++) {
      const roundPacks: Pack[] = []
      
      for (let i = 0; i < players.length; i++) {
        const packCards = shuffled.slice(cardIndex, cardIndex + config.packSize)
        cardIndex += config.packSize
        
        roundPacks.push({
          id: crypto.randomUUID(),
          cards: packCards.map(c => c.scryfallId),
          ownerId: players[i].id
        })
      }
      
      allRounds.push(roundPacks)
    }
    
    return allRounds
  }
  
  static makePick(
    state: DraftState, 
    playerId: string, 
    cardIds: string[],
    cubeCards: CubeCard[]
  ): DraftState {
    const player = state.players.find(p => p.id === playerId)
    if (!player || !player.currentPack) {
      throw new Error('Player has no pack')
    }
    
    if (cardIds.length !== state.config.pickCount) {
      throw new Error(`Must pick exactly ${state.config.pickCount} card(s)`)
    }
    
    const validCards = cardIds.every(id => player.currentPack!.cards.includes(id))
    if (!validCards) {
      throw new Error('Invalid card selection')
    }
    
    const newPack = {
      ...player.currentPack,
      cards: player.currentPack.cards.filter(id => !cardIds.includes(id))
    }
    
    const newPlayers = state.players.map(p => 
      p.id === playerId
        ? {
            ...p,
            draftPool: [...p.draftPool, ...cardIds],
            currentPack: newPack.cards.length > 0 ? newPack : undefined
          }
        : p
    )
    
    return {
      ...state,
      players: newPlayers
    }
  }
  
  static passPacks(state: DraftState): DraftState {
    const direction = state.currentRound % 2 === 0 ? 1 : -1
    
    const rotatedPlayers = state.players.map((player, i) => {
      const receiveFromIndex = (i - direction + state.players.length) % state.players.length
      const receivedPack = state.players[receiveFromIndex].currentPack
      
      return {
        ...player,
        currentPack: receivedPack
      }
    })
    
    return {
      ...state,
      players: rotatedPlayers
    }
  }
  
  static startNextRound(state: any): DraftState {
    const stateWithPacks = state as DraftState & { remainingPacks: Pack[][] }
    
    if (!stateWithPacks.remainingPacks || stateWithPacks.remainingPacks.length === 0) {
      throw new Error('No more packs available')
    }
    
    const nextRoundPacks = stateWithPacks.remainingPacks[0]
    
    const newPlayers = state.players.map((p: DraftPlayer, i: number) => ({
      ...p,
      currentPack: nextRoundPacks[i]
    }))
    
    return {
      ...state,
      players: newPlayers,
      remainingPacks: stateWithPacks.remainingPacks.slice(1)
    }
  }
  
  static exportDeck(state: DraftState, playerId: string, cubeCards: CubeCard[]): any {
    const player = state.players.find(p => p.id === playerId)
    if (!player) {
      throw new Error('Player not found')
    }
    
    const cards = player.draftPool.map(scryfallId => {
      const card = cubeCards.find(c => c.scryfallId === scryfallId)
      return {
        id: scryfallId,
        name: card?.name || 'Unknown',
        quantity: 1
      }
    })
    
    return {
      deckName: `${player.name}'s Draft Deck`,
      cards,
      commanders: []
    }
  }
  
  private static shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }
}