// app/services/draft/DraftAI.ts
import type { Pack, CubeCard } from '@/app/types/Draft'

export class DraftAI {
  
  /**
   * Pick multiple cards that synergize
   */
  static pickCards(pack: Pack, pool: string[], cubeCards: CubeCard[], pickCount: number): string[] {
    if (pickCount === 1) {
      return [this.pickCard(pack, pool, cubeCards)]
    }
    
    const packCards = pack.cards
      .map(id => cubeCards.find(c => c.scryfallId === id))
      .filter(c => c !== undefined) as CubeCard[]
    
    // Score each card
    const scored = packCards.map(card => ({
      card,
      score: this.scoreCard(card, pool, cubeCards)
    }))
    
    // Sort by score
    scored.sort((a, b) => b.score - a.score)
    
    // Pick top card
    if (scored.length === 0) {
        throw new Error('No cards available in pack')
    }
    const picks: string[] = [scored[0].card.scryfallId]
    
    // Pick second card with synergy bonus
    if (pickCount === 2 && scored.length > 1) {
      const firstCard = scored[0].card
      
      // Rescore remaining cards with synergy to first pick
      const remaining = scored.slice(1).map(s => ({
        card: s.card,
        score: s.score + this.getSynergyBonus(s.card, firstCard, pool, cubeCards)
      }))
      
      remaining.sort((a, b) => b.score - a.score)
      picks.push(remaining[0].card.scryfallId)
    }
    
    return picks
  }
  
  /**
   * Legacy single pick method
   */
  static pickCard(pack: Pack, pool: string[], cubeCards: CubeCard[]): string {
    return this.pickCards(pack, pool, cubeCards, 1)[0]
  }
  
  /**
   * Calculate synergy bonus between two cards
   */
  private static getSynergyBonus(card: CubeCard, firstPick: CubeCard, pool: string[], cubeCards: CubeCard[]): number {
    let bonus = 0
    
    // Same colors = strong synergy
    const sharedColors = card.colors.filter(c => firstPick.colors.includes(c))
    bonus += sharedColors.length * 5
    
    // Both colorless
    if (card.colors.length === 0 && firstPick.colors.length === 0) {
      bonus += 3
    }
    
    // Curve synergy - pick cards at different CMCs
    const cmcDiff = Math.abs(card.cmc - firstPick.cmc)
    if (cmcDiff >= 2 && cmcDiff <= 3) {
      bonus += 4  // Good curve spread
    }
    
    // Same type synergy (tribal, etc)
    const sharedTypes = card.types.filter(t => firstPick.types.includes(t))
    if (sharedTypes.length > 0) {
      bonus += 2
    }
    
    return bonus
  }
  
  private static scoreCard(card: CubeCard, pool: string[], cubeCards: CubeCard[]): number {
    let score = 0
    
    // Base rarity bonus
    if (card.rarity === 'mythic') score += 10
    if (card.rarity === 'rare') score += 5
    
    // Curve considerations
    if (card.cmc >= 2 && card.cmc <= 4) score += 3
    if (card.cmc === 1) score += 2
    if (card.cmc >= 7) score -= 2
    
    // Color synergy
    const poolColors = this.getPoolColors(pool, cubeCards)
    if (poolColors.length > 0) {
      const colorMatch = card.colors.some(c => poolColors.includes(c))
      if (colorMatch) score += 8
      if (card.colors.length === 0) score += 3
    } else {
      if (card.colors.includes('U') || card.colors.includes('B')) score += 2
    }
    
    if (card.pickPriority) {
      score += card.pickPriority
    }
    
    return score
  }
  
  private static getPoolColors(pool: string[], cubeCards: CubeCard[]): string[] {
    const colorCounts: Record<string, number> = {}
    
    for (const scryfallId of pool) {
      const card = cubeCards.find(c => c.scryfallId === scryfallId)
      if (!card) continue
      
      for (const color of card.colors) {
        colorCounts[color] = (colorCounts[color] || 0) + 1
      }
    }
    
    return Object.entries(colorCounts)
      .filter(([_, count]) => count >= 3)
      .map(([color]) => color)
  }
}