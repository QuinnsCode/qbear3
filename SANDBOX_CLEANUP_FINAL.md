# Sandbox Cleanup - Final Implementation

## Approach: Selective Broadcasting (NOT Player Removal)

### Key Insight
**We keep all players and their game state intact**. The cleanup system only controls who receives real-time updates, optimizing bandwidth without disrupting the table setup.

## How It Works

### 1. WebSocket Activity Tracking
Every WebSocket connection is tracked with a last-activity timestamp:
- Updated on every message received (including ping/pong)
- Updated when WebSocket is first connected
- Cleaned up when WebSocket disconnects

### 2. Selective Broadcasting
When broadcasting updates (card moves, etc.):
- **Recently Active** (< 5 minutes): Gets all updates
- **Inactive** (> 5 minutes): Skipped (saves bandwidth)
- **Critical Messages**: Always sent to everyone (player_joined, game_deleted, etc.)

### 3. Player Reconnection
When an inactive player reconnects:
- Full game state sent immediately
- Their cards, position, life total all preserved
- No data loss - they pick up right where they left off

## Benefits

### For Users
✅ **Consistent table setup** - Your friends stay at the table
✅ **No interruptions** - Come back hours/days later, everything's there
✅ **Persistent game state** - Cards, life totals, board state all preserved
✅ **Flexible play** - Take breaks, rejoin when ready

### For Performance
✅ **Bandwidth savings** - Don't broadcast to inactive connections
✅ **Lower CPU usage** - Fewer JSON serializations
✅ **Scalable** - 100 players in sandbox, only 10 active = only 10 broadcasts

## Example Scenarios

### Scenario 1: Regular Play Session
```
10:00 AM - Alice, Bob, Carol join and play
10:05 AM - All 3 get updates (all active)
10:30 AM - Alice takes a break (stops sending actions)
10:35 AM - Bob plays a card → Alice skipped, Bob & Carol get update
10:36 AM - Alice comes back, sends ping → Gets full state, resumes receiving updates
```

### Scenario 2: Long-Term Table
```
Monday 2 PM - Friends set up a game together
Tuesday 10 AM - Alice checks in → Full state, her cards still there
Wednesday - Bob comes back → Everything preserved
Thursday - Carol plays → Everyone gets updates when they reconnect
```

### Scenario 3: Mixed Activity
```
5 players at table:
- Alice: Active (gets updates)
- Bob: Inactive 3 min (gets updates, recently active)
- Carol: Inactive 10 min (skipped, will get state on reconnect)
- Dave: Inactive 2 hours (skipped, will get state on reconnect)
- Eve: Disconnected (not in WebSockets list)

State update broadcast: Sent to Alice & Bob only (2/5)
Critical update (player joined): Sent to all connected (4/5, Eve disconnected)
```

## Configuration

### Constants (cardGameDurableObject.ts:38-41)
```typescript
const INACTIVE_THRESHOLD = 2 * 60 * 60 * 1000;  // 2 hours - Track player activity
const CLEANUP_INTERVAL = 30 * 60 * 1000;         // 30 minutes - Cleanup cycle
const WS_BROADCAST_THRESHOLD = 5 * 60 * 1000;    // 5 minutes - Broadcast cutoff
```

### Broadcast Logic
- **Active** (<  5 min): All updates
- **Inactive** (> 5 min): Critical only
- **Critical types**: `game_deleted`, `player_joined`, `player_rejoined`, `game_restarted`

## Cleanup Cycle (Every 30 Minutes)

```typescript
1. Get all connected WebSockets
2. Clean up wsActivity map (remove disconnected sockets)
3. Log stats (total players, active connections)
4. Log individual player activity (if > 6 min inactive)
5. Schedule next cleanup
```

**What it does NOT do:**
- ❌ Remove players from game
- ❌ Delete cards
- ❌ Reset game state
- ❌ Force disconnections

## Implementation Details

### New Data Structure
```typescript
private wsActivity: Map<WebSocket, number> = new Map()
// Key: WebSocket object
// Value: Timestamp of last activity (Date.now())
```

### Activity Tracking Points
1. **WebSocket Connection**: `handleWebSocketUpgrade()` - Initial timestamp
2. **Every Message**: `webSocketMessage()` - Update timestamp
3. **Cleanup**: `alarm()` - Remove disconnected from map

### Broadcast Enhancement
```typescript
// Before (sent to all)
for (const ws of sockets) {
  ws.send(jsonString)
}

// After (selective)
for (const ws of sockets) {
  const lastActivity = this.wsActivity.get(ws) || 0
  const isRecentlyActive = (now - lastActivity) < WS_BROADCAST_THRESHOLD

  if (isCriticalMessage || isRecentlyActive) {
    ws.send(jsonString)
  } else {
    skippedInactive++
  }
}
```

## Monitoring

### Log Patterns

**Broadcast logs:**
```
📊 Broadcast state_update: 3 sent, 0 failed, 2 skipped (inactive)
📊 Broadcast player_joined: 5 sent, 0 failed, 0 skipped (inactive)
```

**Cleanup logs:**
```
🧹 [Sandbox Cleanup] Starting WebSocket activity cleanup...
🧹 [Sandbox Cleanup] Cleaned up 2 disconnected WebSocket(s) from activity map
📊 [Sandbox Stats] 5 player(s) in game, 3 active WebSocket(s)
👤 Player Alice (abc123): 0.3h since last action
👤 Player Bob (def456): 2.1h since last action
⏰ [Sandbox Cleanup] Scheduled next cleanup in 30 minutes
```

## Comparison: Old vs New Approach

| Aspect | Old (Player Removal) | New (Selective Broadcasting) |
|--------|---------------------|------------------------------|
| Players after 2h inactive | **Removed from game** | **Stay in game** |
| Their cards | Deleted | Preserved |
| Their position | Lost | Preserved |
| When they return | Start fresh | Resume where left off |
| Bandwidth for inactive | None (removed) | None (skipped) |
| Friend table setup | Lost after 2h | Persists indefinitely |
| Best for | Rotating players | Consistent groups |

## Migration

### Backward Compatibility
- Existing sandbox games: Players won't be removed anymore
- WebSocket connections: Start tracking activity immediately
- No breaking changes to client code

### Rollout
1. Deploy DO changes
2. Existing games get new broadcast logic on next deployment
3. wsActivity map starts empty, builds up as messages arrive
4. All connections considered "active" until first cleanup cycle

## Future Enhancements

1. **Configurable thresholds per table** - Let users set inactivity timeout
2. **"Away" status** - Show which players are inactive but still in game
3. **Nudge notifications** - Notify inactive players when action needed
4. **Deck persistence** - Save deck loadouts for quick rejoin
5. **Activity dashboard** - Admin view of player activity patterns
