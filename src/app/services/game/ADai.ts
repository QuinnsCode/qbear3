// ADai.ts - Enhanced AI Controller with Setup Phase Support
import type { GameState, Player, Territory } from '@/app/lib/GameState'

export interface AIAction {
  type: string
  playerId: string
  data: any
}

export type AIDifficulty = 'easy' | 'medium' | 'hard'

class AIController {
  private aiPlayers: Map<string, AIDifficulty> = new Map()

  addAIPlayer(playerId: string, difficulty: AIDifficulty = 'medium') {
    this.aiPlayers.set(playerId, difficulty)
    console.log(`🤖 Added AI player ${playerId} with difficulty ${difficulty}`)
  }

  removeAIPlayer(playerId: string) {
    this.aiPlayers.delete(playerId)
    console.log(`🤖 Removed AI player ${playerId}`)
  }

  isAIPlayer(playerId: string): boolean {
    return this.aiPlayers.has(playerId)
  }

  async getAIAction(gameState: GameState, playerId: string): Promise<AIAction | null> {
    if (!this.isAIPlayer(playerId)) {
      return null
    }

    const player = gameState.players.find(p => p.id === playerId)
    if (!player) {
      return null
    }

    // Handle setup phase differently
    if (gameState.status === 'setup') {
      return this.getSetupAction(gameState, player)
    }

    // Handle regular game phases
    return this.getGameAction(gameState, player)
  }

  private getSetupAction(gameState: GameState, player: Player): AIAction | null {
    const remainingUnits = player.remainingUnitsToPlace || 0
    
    if (remainingUnits <= 0) {
      console.log(`🤖 ${player.name} has no units left to place, setup complete`)
      return null
    }

    // Get AI's territories
    const aiTerritories = player.territories.filter(territoryId => 
      gameState.territories[territoryId]?.ownerId === player.id
    )

    if (aiTerritories.length === 0) {
      console.warn(`🤖 ${player.name} has no territories to place units on`)
      return null
    }

    // AI Setup Strategy: Place units strategically
    const territoryId = this.selectBestTerritoryForPlacement(gameState, player, aiTerritories)
    const unitsToPlace = this.calculateUnitsToPlace(gameState, player, remainingUnits)

    console.log(`🤖 ${player.name} placing ${unitsToPlace} units on territory ${territoryId}`)

    return {
      type: 'place_unit',
      playerId: player.id,
      data: {
        territoryId,
        count: unitsToPlace
      }
    }
  }

  private selectBestTerritoryForPlacement(gameState: GameState, player: Player, territories: string[]): string {
    const difficulty = this.aiPlayers.get(player.id) || 'medium'
    
    // Easy AI: Random placement
    if (difficulty === 'easy') {
      return territories[Math.floor(Math.random() * territories.length)]
    }

    // Medium/Hard AI: Strategic placement
    let bestTerritory = territories[0]
    let bestScore = -1

    for (const territoryId of territories) {
      const territory = gameState.territories[territoryId]
      if (!territory) continue

      let score = 0

      // Priority 1: Border territories (adjacent to enemy territories)
      const adjacentEnemies = this.countAdjacentEnemyTerritories(gameState, territory, player.id)
      score += adjacentEnemies * 10

      // Priority 2: Territories with fewer units (need reinforcement)
      score += (10 - territory.machineCount)

      // Priority 3: Central territories (more connections = more strategic value)
      score += territory.connections.length * 2

      // Hard AI: Additional strategic considerations
      if (difficulty === 'hard') {
        // Prioritize continent control
        score += this.getContinentControlValue(gameState, territory, player.id) * 5
        
        // Avoid over-concentrating forces
        if (territory.machineCount > 8) {
          score -= 5
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestTerritory = territoryId
      }
    }

    return bestTerritory
  }

  private calculateUnitsToPlace(gameState: GameState, player: Player, remainingUnits: number): number {
    // SETUP PHASE: Always place 1 unit at a time
    // Server enforces turn limits (3 units per turn)
    return 1
  }

  private countAdjacentEnemyTerritories(gameState: GameState, territory: Territory, playerId: string): number {
    let count = 0
    for (const connectionId of territory.connections) {
      const connectedTerritory = gameState.territories[connectionId]
      if (connectedTerritory && connectedTerritory.ownerId && connectedTerritory.ownerId !== playerId) {
        count++
      }
    }
    return count
  }

  private getContinentControlValue(gameState: GameState, territory: Territory, playerId: string): number {
    // This would check how close the player is to controlling a continent
    // For now, return a simple value - you can enhance this with actual continent data
    return 1
  }

  private getGameAction(gameState: GameState, player: Player): AIAction | null {
    const difficulty = this.aiPlayers.get(player.id) || 'medium'
    
    // Handle different game phases
    switch (gameState.currentPhase) {
      case 1: // Bidding
        return this.getBiddingAction(gameState, player, difficulty)
      
      case 2: // Collect & Deploy
        return this.getDeployAction(gameState, player, difficulty)
      
      case 3: // Hire & Build
        return this.getHireBuildAction(gameState, player, difficulty)
      
      case 4: // Buy Command Cards
        return this.getBuyCardsAction(gameState, player, difficulty)
      
      case 5: // Play Command Cards
        return this.getPlayCardsAction(gameState, player, difficulty)
      
      case 6: // Invade Territories
        return this.getAttackAction(gameState, player, difficulty)
      
      case 7: // Fortify Position
        return this.getFortifyAction(gameState, player, difficulty)
      
      default:
        console.log(`🤖 ${player.name} advancing phase from ${gameState.currentPhase}`)
        return {
          type: 'advance_phase',
          playerId: player.id,
          data: {}
        }
    }
  }

  private getBiddingAction(gameState: GameState, player: Player, difficulty: AIDifficulty): AIAction {
    // Simple bidding logic - can be enhanced
    const bidAmount = difficulty === 'easy' ? 1 : (difficulty === 'medium' ? 2 : 3)
    
    return {
      type: 'place_bid',
      playerId: player.id,
      data: { amount: bidAmount }
    }
  }

  private getDeployAction(gameState: GameState, player: Player, difficulty: AIDifficulty): AIAction | null {
    // Calculate income and deploy units
    const territories = player.territories
    const income = Math.floor(territories.length / 3) + 3 // Base income calculation
    
    if (territories.length === 0) {
      return {
        type: 'advance_phase',
        playerId: player.id,
        data: {}
      }
    }

    // Deploy to border territories
    const borderTerritories = territories.filter(territoryId => {
      const territory = gameState.territories[territoryId]
      return territory && this.countAdjacentEnemyTerritories(gameState, territory, player.id) > 0
    })

    const targetTerritoryId = borderTerritories.length > 0 
      ? borderTerritories[Math.floor(Math.random() * borderTerritories.length)]
      : territories[Math.floor(Math.random() * territories.length)]

    return {
      type: 'deploy_machines',
      playerId: player.id,
      data: {
        territoryId: targetTerritoryId,
        count: Math.min(income, 3)
      }
    }
  }

  private getHireBuildAction(gameState: GameState, player: Player, difficulty: AIDifficulty): AIAction {
    // For now, just advance phase - can add commander hiring logic later
    return {
      type: 'advance_phase',
      playerId: player.id,
      data: {}
    }
  }

  private getBuyCardsAction(gameState: GameState, player: Player, difficulty: AIDifficulty): AIAction {
    // For now, just advance phase - can add card buying logic later
    return {
      type: 'advance_phase',
      playerId: player.id,
      data: {}
    }
  }

  private getPlayCardsAction(gameState: GameState, player: Player, difficulty: AIDifficulty): AIAction {
    // For now, just advance phase - can add card playing logic later
    return {
      type: 'advance_phase',
      playerId: player.id,
      data: {}
    }
  }

  private getAttackAction(gameState: GameState, player: Player, difficulty: AIDifficulty): AIAction | null {
    // Find territories with > 1 unit that can attack
    const attackingTerritories = player.territories.filter(territoryId => {
      const territory = gameState.territories[territoryId]
      return territory && territory.machineCount > 1
    })

    if (attackingTerritories.length === 0) {
      return {
        type: 'advance_phase',
        playerId: player.id,
        data: {}
      }
    }

    // Find a good attack opportunity
    for (const territoryId of attackingTerritories) {
      const territory = gameState.territories[territoryId]
      if (!territory) continue

      for (const connectionId of territory.connections) {
        const target = gameState.territories[connectionId]
        if (!target || target.ownerId === player.id) continue

        // Attack if we have more units
        if (territory.machineCount > target.machineCount) {
          const attackingUnits = Math.min(territory.machineCount - 1, 3)
          
          //this is deprecated to now be invade territory but we will come back to this
          return {
            type: 'invade_territory',
            playerId: player.id,
            data: {
              fromTerritoryId: territoryId,
              toTerritoryId: connectionId,
              attackingUnits
            }
          }
        }
      }
    }

    // No good attacks found
    return {
      type: 'advance_phase',
      playerId: player.id,
      data: {}
    }
  }

  private getFortifyAction(gameState: GameState, player: Player, difficulty: AIDifficulty): AIAction {
    // Simple fortify logic - move units from safe territories to border territories
    const safeTerritories = player.territories.filter(territoryId => {
      const territory = gameState.territories[territoryId]
      return territory && 
             territory.machineCount > 1 && 
             this.countAdjacentEnemyTerritories(gameState, territory, player.id) === 0
    })

    const borderTerritories = player.territories.filter(territoryId => {
      const territory = gameState.territories[territoryId]
      return territory && this.countAdjacentEnemyTerritories(gameState, territory, player.id) > 0
    })

    if (safeTerritories.length > 0 && borderTerritories.length > 0) {
      const fromTerritory = safeTerritories[0]
      const toTerritory = borderTerritories[0]
      const fromTerr = gameState.territories[fromTerritory]
      
      if (fromTerr && fromTerr.machineCount > 1) {
        return {
          type: 'fortify_territory',
          playerId: player.id,
          data: {
            fromTerritoryId: fromTerritory,
            toTerritoryId: toTerritory,
            unitCount: Math.min(fromTerr.machineCount - 1, 2)
          }
        }
      }
    }

    return {
      type: 'advance_phase',
      playerId: player.id,
      data: {}
    }
  }
}

export const globalAIController = new AIController()