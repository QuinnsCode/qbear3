// ===== /app/services/game/combatService.ts =====
export function resolveCombat(
  attackingUnits: number,
  defendingUnits: number,
  attackerId: string,
  defenderId: string
): {
  attackerLosses: number,
  defenderLosses: number,
  attackerUnitsRemaining: number,
  victory: 'attacker' | 'defender'
} {
  console.log(`⚔️ Combat: ${attackingUnits} attackers vs ${defendingUnits} defenders`)
  
  let attackerRemaining = attackingUnits
  let defenderRemaining = defendingUnits
  
  while (attackerRemaining > 0 && defenderRemaining > 0) {
    const attackerRoll = rollDice('d6')
    const defenderRoll = rollDice('d6')
    
    console.log(`🎲 Attacker rolls ${attackerRoll}, Defender rolls ${defenderRoll}`)
    
    if (attackerRoll > defenderRoll) {
      defenderRemaining--
      console.log('🗡️ Defender loses 1 unit')
    } else {
      attackerRemaining--
      console.log('🛡️ Attacker loses 1 unit')
    }
  }
  
  const result = {
    attackerLosses: attackingUnits - attackerRemaining,
    defenderLosses: defendingUnits - defenderRemaining,
    attackerUnitsRemaining: attackerRemaining,
    victory: defenderRemaining <= 0 ? 'attacker' : 'defender' as 'attacker' | 'defender'
  }
  
  console.log(`⚔️ Combat result:`, result)
  return result
}

function rollDice(diceType: 'd6' | 'd8'): number {
  const max = diceType === 'd6' ? 6 : 8
  return Math.floor(Math.random() * max) + 1
}