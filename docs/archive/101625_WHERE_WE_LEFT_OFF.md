Risk 2210 Instant Card Interrupt System
Core Architecture: Hold-to-Interrupt + Rope System
Hold-to-Interrupt Mechanics

Players must physically hold button/key to signal readiness to interrupt
Interrupt cards only visible while actively holding
Must maintain hold to see available responses
Can release and re-hold multiple times during action window
Prevents passive timer abuse - requires active engagement

Rope System (MTG Arena Style)
typescriptinterface PlayerRope {
  playerId: string
  totalRopeTimeMs: number    // Base: 30s per turn
  ropeUsedThisTurn: number
  averageResponseTime: number // Tracked over last 20 interactions  
  griefScore: number         // Exponential backoff multiplier
}
Behavioral Tracking & Anti-Grief
Response Time Categories:

Fast responders (<5s avg): Rope increases to 45s
Legitimate slow (10-15s, high card usage): Normal 30s
Time wasters (>20s avg, low card usage): Exponential rope reduction

Escalation System:

1st abuse: 20s rope next game
Repeat: 15s → 10s → 5s minimum
Rehabilitation: Rope recovers with good behavior
Separate queues: Chronic griefers matched together

Hold + Rope Integration

Hold button enters interrupt mode
Rope burns 2x speed while holding (encourages quick decisions)
Release stops rope burn
No rope remaining = no interrupt capability
Bluffing allowed but costs rope time

Card Timing Categories

Opponent Invades: Combat tricks (Stealth MODs, Water Death Trap)
Before Invasions: Pre-phase setup cards
End of Turn: Turn manipulation cards
End Game: Victory condition modifiers

Technical Requirements

Real-time WebSocket action streaming
Granular action state broadcasting
Context-sensitive card filtering
Rope timer synchronization
Behavioral pattern tracking database

This system maintains competitive integrity while preventing griefing through active engagement requirements and adaptive timing based on player behavior.