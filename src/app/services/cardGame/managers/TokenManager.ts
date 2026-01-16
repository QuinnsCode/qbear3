// src/app/services/cardGame/managers/TokenManager.ts

import type { 
    CardGameState, 
    CardGameAction, 
    Card,
    TokenData,
    ScryfallCard,
    ZoneType
  } from '../CardGameState'
  
  /**
   * TokenManager
   * 
   * Handles token creation on the battlefield:
   * - Creates tokens from Scryfall data (if found)
   * - Creates custom tokens (user-defined)
   * - Places tokens on battlefield at specified position
   * - Destroys tokens when they leave the battlefield
   */
  export class TokenManager {
    
    /**
     * Create a token on the battlefield
     * Token goes directly to battlefield at the specified position
     */
    static createToken(
        gameState: CardGameState,
        action: CardGameAction
      ): CardGameState {
        const { tokenData, position } = action.data
        const playerId = action.playerId
        
        // Find player
        const player = gameState.players.find(p => p.id === playerId)
        if (!player) {
          console.warn(`Player ${playerId} not found`)
          return gameState
        }
        
        // ✅ COUNT EXISTING TOKENS
        const existingTokenCount = Object.values(gameState.cards).filter(
          card => card.isToken === true
        ).length
        
        const TOKEN_LIMIT = 256
        
        if (existingTokenCount >= TOKEN_LIMIT) {
          console.warn(`🚫 Token limit reached (${TOKEN_LIMIT}). Cannot create more tokens.`)
          return gameState
        }
        
        // Create unique instance ID for token
        const instanceId = `token-${crypto.randomUUID()}`
        
        // Use a placeholder scryfallId for tokens (we don't have real ones)
        // This allows the card system to work without modification
        const scryfallId = tokenData.imageUrl 
          ? tokenData.imageUrl.split('/').pop()?.split('.')[0] || 'token-placeholder'
          : 'token-placeholder'
        
        // Create the token card
        const tokenCard: Card = {
          instanceId,
          scryfallId,
          ownerId: playerId,
          zone: 'battlefield',
          position,
          rotation: 0,
          isFaceUp: true,
          isToken: true,
          tokenData,
        }
        
        // Add to game state
        const updatedCards = {
          ...gameState.cards,
          [instanceId]: tokenCard
        }
        
        // Add to player's battlefield zone
        const updatedPlayers = gameState.players.map(p => 
          p.id === playerId
            ? {
                ...p,
                zones: {
                  ...p.zones,
                  battlefield: [...p.zones.battlefield, instanceId]
                }
              }
            : p
        )
        
        console.log(`✅ Created token "${tokenData.name}" for player ${playerId} at (${position.x}, ${position.y}) (${existingTokenCount + 1}/${TOKEN_LIMIT})`)
        
        return {
          ...gameState,
          cards: updatedCards,
          players: updatedPlayers
        }
    }
    
    /**
     * Check if a token should be destroyed (leaving battlefield)
     * Returns true if the card is a token moving from battlefield to another zone
     */
    static shouldDestroyToken(
      card: Card,
      fromZone: ZoneType,
      toZone: ZoneType
    ): boolean {
      return card.isToken === true && fromZone === 'battlefield' && toZone !== 'battlefield'
    }
    
    /**
     * Destroy a token (remove it completely from game state)
     * Tokens cease to exist when they leave the battlefield
     */
    static destroyToken(
      gameState: CardGameState,
      cardId: string,
      playerId: string
    ): CardGameState {
      const card = gameState.cards[cardId]
      
      if (!card) {
        console.warn(`Card ${cardId} not found`)
        return gameState
      }
      
      console.log(`🪙 Token "${card.tokenData?.name || 'Unknown'}" ceases to exist`)
      
      // Remove from cards entirely
      const updatedCards = { ...gameState.cards }
      delete updatedCards[cardId]
      
      // Remove from player's zones
      const updatedPlayers = gameState.players.map(p => {
        if (p.id !== playerId) return p
        
        // Remove from ALL zones (should only be in one, but be thorough)
        return {
          ...p,
          zones: {
            library: p.zones.library.filter(id => id !== cardId),
            hand: p.zones.hand.filter(id => id !== cardId),
            battlefield: p.zones.battlefield.filter(id => id !== cardId),
            graveyard: p.zones.graveyard.filter(id => id !== cardId),
            exile: p.zones.exile.filter(id => id !== cardId),
            command: p.zones.command.filter(id => id !== cardId)
          }
        }
      })
      
      return {
        ...gameState,
        cards: updatedCards,
        players: updatedPlayers
      }
    }

    /**
     * Handle token zone transfer
     * 
     * MTG Rule: Tokens cease to exist when they leave the battlefield
     * 
     * Returns:
     * - Modified gameState if token was destroyed
     * - null if this is not a token or doesn't need special handling
     */
    static handleTokenZoneTransfer(
        gameState: CardGameState,
        cardId: string,
        playerId: string,
        fromZone: ZoneType,
        toZone: ZoneType
    ): CardGameState | null {
        const card = gameState.cards[cardId]
        
        // Not a token? Let normal card logic handle it
        if (!card?.isToken) {
        return null
        }
        
        // Token leaving battlefield? Destroy it
        if (fromZone === 'battlefield' && toZone !== 'battlefield') {
        console.log(`🪙 Token "${card.tokenData?.name || 'Unknown'}" ceases to exist (moved to ${toZone})`)
        return this.destroyToken(gameState, cardId, playerId)
        }
        
        // Token moving within battlefield or other cases? Let normal logic handle it
        return null
    }
    
    /**
     * Search Scryfall for token by name
     * Returns token data if found, null otherwise
     */
    static async searchScryfallToken(
      tokenName: string
    ): Promise<TokenData | null> {
      try {
        // Scryfall API: Search for exact token match
        const query = encodeURIComponent(`!"${tokenName}" t:token`)
        const url = `https://api.scryfall.com/cards/search?q=${query}&unique=cards`
        
        console.log(`🔍 Searching Scryfall for token: "${tokenName}"`)
        
        const response = await fetch(url)
        
        if (!response.ok) {
          console.log(`❌ Token "${tokenName}" not found on Scryfall`)
          return null
        }
        
        const data = await response.json()
        
        if (!data.data || data.data.length === 0) {
          console.log(`❌ No results for token "${tokenName}"`)
          return null
        }
        
        // Get first result
        const card: ScryfallCard = data.data[0]
        
        const tokenData: TokenData = {
          name: card.name,
          typeLine: card.type_line,
          power: card.power,
          toughness: card.toughness,
          oracleText: card.oracle_text,
          colors: card.colors,
          imageUrl: card.image_uris?.normal || card.image_uris?.large
        }
        
        console.log(`✅ Found token on Scryfall: "${card.name}"`)
        
        return tokenData
      } catch (error) {
        console.error('Error searching Scryfall:', error)
        return null
      }
    }
    
    /**
     * Create a custom token from user input
     * Used when token doesn't exist on Scryfall
     */
    static createCustomTokenData(
      name: string,
      typeLine: string,
      power?: string,
      toughness?: string,
      oracleText?: string
    ): TokenData {
      return {
        name,
        typeLine,
        power,
        toughness,
        oracleText,
        colors: [],
        imageUrl: undefined
      }
    }
    
    /**
     * Get common token presets (for quick access)
     */
    static getCommonTokens(): Array<{ name: string; typeLine: string; power?: string; toughness?: string }> {
      return [
        { name: 'Treasure', typeLine: 'Artifact — Treasure' },
        { name: 'Clue', typeLine: 'Artifact — Clue' },
        { name: 'Food', typeLine: 'Artifact — Food' },
        { name: 'Soldier', typeLine: 'Creature — Soldier', power: '1', toughness: '1' },
        { name: 'Goblin', typeLine: 'Creature — Goblin', power: '1', toughness: '1' },
        { name: 'Zombie', typeLine: 'Creature — Zombie', power: '2', toughness: '2' },
        { name: 'Saproling', typeLine: 'Creature — Saproling', power: '1', toughness: '1' },
      ]
    }
  }