🎯 AI Personality Profiles:
🔥 AGGRO - "Conqueror"

Setup: Places units on border territories, prioritizes territories with most connections
Turn Placement: Masses troops on front lines, targets enemy borders
Cards: Buys NUKE commander early, focuses on attack/damage cards
Bidding: Bids high early years to strike first, saves energy late game for cards
Strategy: Goes for continent bonuses through conquest, attacks immediately when able

🛡️ DEFENSIVE - "Fortress"

Setup: Clusters in low-connection territories, builds defensive positions
Turn Placement: Reinforces chokepoints, builds tall stacks
Cards: Emphasizes LAND + DIPLOMAT cards, defensive abilities
Bidding: Moderate bidding, values going last to react
Strategy: Holds 3+ territory clusters, uses diplomacy to avoid early conflicts

🌊 EVASIVE - "Nomad"

Setup: Places near water territories, avoids human player borders
Turn Placement: Retreats from large enemy forces, spreads out
Cards: Buys WATER commander, mobility/escape cards
Bidding: Bids low early, saves for late game space base rush
Strategy: Escapes to water territories, builds sea empire

⚡ EFFICIENT - "Calculator"

Setup: Optimizes for small continent bonuses, calculates unit efficiency
Turn Placement: Takes easy targets, maximizes territory income
Cards: Buys cards that give resource advantages
Bidding: Calculated bidding based on expected returns
Strategy: Snowballs through efficient moves, adapts to opportunities

💾 Implementation:
typescript// Add to GameState types
export type AIVibe = 'aggro' | 'defensive' | 'evasive' | 'efficient'

export interface Player {
  // ... existing properties
  aiVibe?: AIVibe // Only set for AI players
}