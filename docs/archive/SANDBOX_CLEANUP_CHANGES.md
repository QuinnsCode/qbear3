# Sandbox Cleanup Implementation

## Changes Made

### 1. Aggressive Cleanup Timings
**File**: `src/cardGameDurableObject.ts`

**Before**:
```typescript
const INACTIVE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;   // Run cleanup every 24 hours
```

**After**:
```typescript
const INACTIVE_THRESHOLD = 2 * 60 * 60 * 1000;  // 2 hours - Remove inactive players quickly
const CLEANUP_INTERVAL = 30 * 60 * 1000;         // 30 minutes - Frequent cleanup checks
const EMPTY_GAME_RESET_THRESHOLD = 6 * 60 * 60 * 1000; // 6 hours - Reset game if empty
```

**Impact**:
- Players removed after 2 hours of inactivity (was 24 hours)
- Cleanup runs every 30 minutes (was 24 hours)
- Keeps sandbox fresh and performant for testing

### 2. Enhanced Alarm Handler

**New Features**:
- ✅ Better logging with `[Sandbox Cleanup]` prefix
- ✅ Shows hours inactive with 1 decimal precision
- ✅ Counts and reports cards removed along with players
- ✅ Resets game state if empty for 6+ hours
- ✅ Tracks when game becomes empty to start reset timer

**Empty Game Reset Logic**:
```typescript
if (game is empty) {
  if (empty for 6+ hours) {
    → Reset game state (clear cards, players, but keep sandbox flag)
    → Ready for fresh players to join
  } else {
    → Start/continue empty timer
    → Log hours until reset
  }
} else {
  → Reset empty timer (game has players)
}
```

### 3. Improved Logging

**Before**: Generic messages
```
🧹 Running sandbox cleanup...
✅ Cleanup complete: removed 2 inactive player(s)
```

**After**: Detailed, categorized logs
```
🧹 [Sandbox Cleanup] Starting cleanup check...
🗑️ [Sandbox Cleanup] Removing inactive player: Alice (inactive for 2.3h)
🗑️ [Sandbox Cleanup] Removing inactive player: Bob (inactive for 3.1h)
✅ [Sandbox Cleanup] Removed 2 player(s) and 47 card(s)
ℹ️ [Sandbox Cleanup] Game now empty - will reset in 6.0h if no one joins
⏰ [Sandbox Cleanup] Scheduled next cleanup in 30 minutes
```

## Benefits

### For Users
- **Faster cleanup** = Less clutter from abandoned test sessions
- **Can return anytime** = DO never deleted, just reset when empty
- **Fresh environment** = Game resets after 6 hours of zero activity
- **No data loss** = Can rejoin and load a deck within 2 hours

### For Cost/Performance
- **Less memory** = Inactive players and their cards removed every 30 min
- **Smaller state** = Empty games reset to minimal state
- **Better performance** = Frequent cleanup prevents state bloat
- **Still cost-efficient** = Single persistent DO (not deleted)

## Behavior Examples

### Scenario 1: Active Testing
```
10:00 AM - Alice joins with deck A
10:15 AM - Bob joins with deck B
10:30 AM - Cleanup runs → Both active, nothing removed
11:00 AM - Cleanup runs → Both active, nothing removed
12:00 PM - Alice leaves (stops sending actions)
12:30 PM - Cleanup runs → Alice still recent, both kept
02:00 PM - Bob still playing
02:30 PM - Cleanup runs → Alice inactive 2h, removed with cards
```

### Scenario 2: Complete Abandonment
```
10:00 AM - Last player leaves
10:30 AM - Cleanup runs → Empty timer starts
11:00 AM - Cleanup runs → 0.5h empty
...
04:00 PM - Cleanup runs → 6h empty → RESET GAME STATE
04:15 PM - New player joins → Fresh, clean sandbox
```

### Scenario 3: Intermittent Use
```
10:00 AM - Alice plays for 1 hour, leaves
11:00 AM - Cleanup runs → Alice inactive 0h, kept
01:00 PM - Cleanup runs → Alice inactive 2h, removed
01:30 PM - Empty timer starts
03:00 PM - Bob joins before reset → Timer resets
05:00 PM - Bob leaves
11:00 PM - Game empty 6h → Reset
```

## Migration Notes

### Existing Sandbox
- Already has alarm scheduled (24h interval)
- Next alarm will fire at old interval one last time
- After that, reschedules with new 30min interval
- No action needed - automatic migration

### New Sandboxes
- Get 30min interval from first initialization
- Immediate aggressive cleanup behavior

## Monitoring

Watch for these log patterns:
- `[Sandbox Cleanup] Removed X player(s) and Y card(s)` - Normal cleanup
- `[Sandbox Cleanup] Game empty for 6+ hours - resetting` - Empty reset
- `[Sandbox Cleanup] All X players active` - Healthy usage

## Future Enhancements

Potential improvements:
1. **Configurable thresholds** - Admin can adjust timing via API
2. **Usage metrics** - Track peak players, cleanup frequency
3. **Player notifications** - Warn before removal (if WebSocket connected)
4. **Deck persistence** - Save deck for 24h even after player removed
