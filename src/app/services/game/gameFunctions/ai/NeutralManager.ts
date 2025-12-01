// src/app/services/game/gameFunctions/neutral/NeutralManager.ts
import type { GameState, Player, Territory } from '@/app/lib/GameState';

export type NeutralMode = 'passive' | 'zombie' | 'aggressive';

/**
 * NeutralManager - Manages neutral/NPC behavior
 * 
 * CURRENT MODE: 'passive' - Neutrals do nothing, act as obstacles
 * FUTURE MODES:
 * - 'zombie': Neutrals get 1 unit per territory, attack until down to 1, defend on 8-sided dice
 * - 'aggressive': Neutrals actively expand and fortify
 */
export class NeutralManager {
  private mode: NeutralMode = 'passive';
  
  constructor(
    private applyAction: (action: any) => Promise<GameState>,
    private getGameState: () => GameState | null
  ) {}

  /**
   * Set the neutral behavior mode
   */
  setMode(mode: NeutralMode): void {
    console.log(`🧟 Neutral mode changed: ${this.mode} → ${mode}`);
    this.mode = mode;
  }

  /**
   * Get the current neutral behavior mode
   */
  getMode(): NeutralMode {
    return this.mode;
  }

  /**
   * Check if a player is a neutral/NPC
   */
  isNeutralPlayer(playerId: string): boolean {
    return playerId === 'npc-neutral' || 
           playerId.includes('npc') || 
           playerId.includes('neutral');
  }

  /**
   * Get all neutral-owned territories
   */
  getNeutralTerritories(gameState: GameState): Territory[] {
    return Object.values(gameState.territories).filter(territory => 
      territory.ownerId && this.isNeutralPlayer(territory.ownerId)
    );
  }

  /**
   * Execute neutral turn based on current mode
   * This should be called at the start of each game year or during specific phases
   */
  async executeNeutralActions(gameState: GameState): Promise<void> {
    if (!gameState) return;

    const neutralTerritories = this.getNeutralTerritories(gameState);
    if (neutralTerritories.length === 0) {
      console.log('🧟 No neutral territories to manage');
      return;
    }

    console.log(`🧟 Executing neutral actions in '${this.mode}' mode for ${neutralTerritories.length} territories`);

    switch (this.mode) {
      case 'passive':
        await this.executePassiveMode(gameState, neutralTerritories);
        break;
      case 'zombie':
        await this.executeZombieMode(gameState, neutralTerritories);
        break;
      case 'aggressive':
        await this.executeAggressiveMode(gameState, neutralTerritories);
        break;
    }
  }

  /**
   * PASSIVE MODE: Neutrals do nothing
   * They just sit there as obstacles
   */
  private async executePassiveMode(gameState: GameState, territories: Territory[]): Promise<void> {
    console.log('🧟 Passive mode: Neutrals remain idle');
    // Do nothing - neutrals are just obstacles
  }

  /**
   * ZOMBIE MODE: Neutrals get reinforcements and attack
   * - Each territory gets +1 unit per turn
   * - Attack adjacent player territories until down to 1 unit
   * - Defend on 8-sided dice (hard to eliminate last unit)
   */
  private async executeZombieMode(gameState: GameState, territories: Territory[]): Promise<void> {
    console.log('🧟 Zombie mode: Reinforcing and attacking');

    // Phase 1: Reinforce each neutral territory with 1 unit
    for (const territory of territories) {
      console.log(`🧟 Reinforcing ${territory.name} (+1 unit)`);
      
      await this.applyAction({
        type: 'neutral_reinforce',
        playerId: 'npc-neutral',
        data: {
          territoryId: territory.id,
          amount: 1
        }
      });
    }

    // Phase 2: Attack from territories with 2+ units
    const attackingTerritories = territories.filter(t => t.machineCount >= 2);
    
    for (const territory of attackingTerritories) {
      const targets = this.getAdjacentPlayerTerritories(gameState, territory);
      
      if (targets.length === 0) continue;

      // Pick random target
      const target = targets[Math.floor(Math.random() * targets.length)];
      
      // Attack with all units except 1
      const attackingUnits = territory.machineCount - 1;
      
      console.log(`🧟 ${territory.name} attacking ${target.name} with ${attackingUnits} units`);
      
      await this.applyAction({
        type: 'neutral_attack',
        playerId: 'npc-neutral',
        data: {
          fromTerritoryId: territory.id,
          toTerritoryId: target.id,
          attackingUnits,
          defenseBonus: true // Neutrals defend on 8-sided dice
        }
      });
    }
  }

  /**
   * AGGRESSIVE MODE: Neutrals actively expand (future implementation)
   * - Get 2+ units per territory
   * - Strategic expansion AI
   * - Fortify defensively
   */
  private async executeAggressiveMode(gameState: GameState, territories: Territory[]): Promise<void> {
    console.log('🧟 Aggressive mode: Active expansion (not yet implemented)');
    // TODO: Implement aggressive neutral AI
    // For now, fall back to zombie mode
    await this.executeZombieMode(gameState, territories);
  }

  /**
   * Get adjacent territories owned by actual players (not neutrals)
   */
  private getAdjacentPlayerTerritories(gameState: GameState, territory: Territory): Territory[] {
    return territory.connections
      .map(connId => gameState.territories[connId])
      .filter(conn => 
        conn && 
        conn.ownerId && 
        !this.isNeutralPlayer(conn.ownerId) &&
        conn.machineCount > 0
      );
  }

  /**
   * Calculate neutral defense dice (8-sided for zombie mode)
   */
  getDefenseDiceForMode(): number {
    switch (this.mode) {
      case 'zombie':
        return 8; // 8-sided dice makes neutrals harder to kill
      case 'aggressive':
        return 8;
      case 'passive':
      default:
        return 6; // Standard dice
    }
  }

  /**
   * Check if neutrals should get reinforcements this turn
   */
  shouldReinforceThisTurn(gameState: GameState): boolean {
    // In zombie/aggressive mode, reinforce at start of each year
    return this.mode === 'zombie' || this.mode === 'aggressive';
  }

  /**
   * Clear all timeouts (for cleanup when game is deleted)
   * NeutralManager doesn't currently use timeouts, but this method
   * is here for consistency with other managers
   */
  clearAllTimeouts(): void {
    console.log('✅ NeutralManager: No timeouts to clear (passive manager)');
    // No timeouts to clear in current implementation
    // This method exists for API consistency with AiManager
  }
}

// Global instance (similar to globalAIManager)
let globalNeutralManager: NeutralManager | null = null;

export function initializeNeutralManager(
  applyAction: (action: any) => Promise<GameState>,
  getGameState: () => GameState | null
): NeutralManager {
  globalNeutralManager = new NeutralManager(applyAction, getGameState);
  return globalNeutralManager;
}

export function getNeutralManager(): NeutralManager {
  if (!globalNeutralManager) {
    throw new Error('NeutralManager not initialized');
  }
  return globalNeutralManager;
}

