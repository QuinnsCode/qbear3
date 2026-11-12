# Durable Object Cleanup Strategy

## Current State Analysis

### ✅ What We Have

1. **Manual DELETE Endpoints**
   - All DOs support DELETE requests to wipe storage
   - `deleteCardGame()` and `deleteGame()` server actions exist
   - These are only called manually, not automatically

2. **Partial Alarm-Based Cleanup**
   - **CardGameDO**: Removes inactive players from sandbox games every 24 hours
   - **VTT DO**: Cleans up player activity tracking every 4 hours
   - These clean up *data within* DOs, not the DOs themselves

3. **Status Tracking in KV**
   - Games can be marked as 'completed' in registry
   - Drafts tracked with status in `draftTracking.ts`
   - **Problem**: Completed/abandoned resources never cleaned up

### ❌ What's Missing

1. **No Automatic DO Deletion**
   - Completed games persist forever in DOs
   - Abandoned drafts persist forever in DOs
   - Inactive games/drafts persist forever
   - **Cost Impact**: DOs bill for storage and existence, even when idle

2. **No KV Cleanup**
   - Completed game entries stay in registry KV forever
   - Completed draft metadata stays in KV forever
   - Old deck data never expires

3. **No Orphan Detection**
   - If KV delete succeeds but DO delete fails, we have orphaned DOs
   - If DO delete succeeds but KV fails, we have orphaned KV entries

---

## Special Case: Sandbox Game

The sandbox game (`regal-gray-wolf`) is a **persistent, shared testing environment**:

### Requirements
- ✅ **Never delete the DO** - Users should always be able to access it
- ✅ **Aggressive player cleanup** - Remove inactive players after 2 hours
- ✅ **State reset when empty** - Clear game state after 24 hours of zero players
- ✅ **Fast rejoin** - Players can return anytime with a fresh deck

### Current Implementation
- Removes inactive players every 24 hours (already working)
- Does NOT delete the DO itself

### Recommended Changes
1. **Increase cleanup frequency**: Check every 1 hour (not 24 hours)
2. **Shorten inactivity threshold**: Remove players after 2 hours (not 24 hours)
3. **Add state reset**: If empty for 24 hours, clear cards/zones but keep DO alive
4. **Add player activity tracking**: Track last action per player for accurate cleanup

---

## Recommended Cleanup Strategy

### Phase 1: Time-Based DO Self-Destruction (Alarms)

Add alarm-based cleanup to each DO type:

#### **DraftDO** - Auto-cleanup after 30 days
```typescript
async alarm(): Promise<void> {
  const createdAt = await this.ctx.storage.get<number>('createdAt')
  const age = Date.now() - (createdAt || 0)
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

  if (age > THIRTY_DAYS) {
    console.log('🗑️ Auto-deleting draft older than 30 days')
    await this.ctx.storage.deleteAll()
    return
  }

  // If draft is complete, delete after 7 days
  const state = await this.getState()
  if (state.status === 'complete') {
    const completedAge = Date.now() - new Date(state.updatedAt).getTime()
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

    if (completedAge > SEVEN_DAYS) {
      console.log('🗑️ Auto-deleting completed draft after 7 days')
      await this.ctx.storage.deleteAll()
      return
    }
  }

  // Schedule next check in 24 hours
  await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000)
}
```

#### **CardGameDO** - Special handling for sandbox vs regular games
```typescript
async alarm(): Promise<void> {
  const isSandbox = await this.ctx.storage.get('isSandbox')
  const gameId = (this.ctx.id as DurableObjectId).name

  if (isSandbox || gameId === 'regal-gray-wolf') {
    // SANDBOX: Aggressive player cleanup, but NEVER delete the DO itself
    // Players can rejoin anytime with a fresh deck

    // Remove players inactive > 2 hours (already implemented)
    const TWO_HOURS = 2 * 60 * 60 * 1000
    const now = Date.now()
    const playerActivity = await this.ctx.storage.get<Map<string, number>>('playerActivity') || new Map()

    let playersRemoved = 0
    for (const [playerId, lastActive] of playerActivity.entries()) {
      if (now - lastActive > TWO_HOURS) {
        await this.removePlayer(playerId)
        playerActivity.delete(playerId)
        playersRemoved++
      }
    }

    if (playersRemoved > 0) {
      console.log(`🧹 Removed ${playersRemoved} inactive players from sandbox`)
      await this.ctx.storage.put('playerActivity', playerActivity)
    }

    // If completely empty for 24 hours, reset game state but keep DO alive
    const state = await this.getState()
    if (state.players.length === 0) {
      const lastActivity = await this.ctx.storage.get<number>('lastActivityTimestamp') || now
      const emptyAge = now - lastActivity
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

      if (emptyAge > TWENTY_FOUR_HOURS) {
        console.log('🧹 Resetting empty sandbox game state')
        await this.resetGameState() // Clear cards, zones, but keep DO alive
        await this.ctx.storage.put('lastActivityTimestamp', now)
      }
    }

    // Schedule next check in 1 hour for sandbox (more frequent)
    await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000)

  } else {
    // REGULAR GAMES: Delete entire DO if inactive for 60 days
    const lastActivity = await this.ctx.storage.get<number>('lastActivityTimestamp')
    const age = Date.now() - (lastActivity || 0)
    const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000

    if (age > SIXTY_DAYS) {
      console.log('🗑️ Auto-deleting inactive game older than 60 days')
      await this.ctx.storage.deleteAll()
      return
    }

    // Schedule next check in 24 hours for regular games
    await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000)
  }
}
```

#### **GameStateDO** - Same strategy as CardGameDO

### Phase 2: KV Cleanup with Cron Triggers

Create scheduled cleanup jobs using Cloudflare Cron Triggers:

#### `/api/cron/cleanup-old-games` (runs daily)
```typescript
// Delete completed games older than 30 days from KV
// Delete game registry entries for games that don't exist in DO
```

#### `/api/cron/cleanup-old-drafts` (runs daily)
```typescript
// Remove completed/abandoned drafts from tracking KV after 7 days
// Remove draft metadata for DOs that no longer exist
```

#### `/api/cron/cleanup-old-decks` (runs weekly)
```typescript
// Delete draft deck data from DECKS_KV after 90 days
```

Add to `wrangler.jsonc`:
```json
"triggers": {
  "crons": [
    "0 2 * * *"  // 2 AM UTC daily
  ]
}
```

### Phase 3: Orphan Detection & Repair

Create admin endpoint to find and fix orphans:

#### `/api/admin/cleanup-orphans`
```typescript
// 1. List all game IDs in KV
// 2. Check if corresponding DO exists (try to fetch)
// 3. Delete KV entries for non-existent DOs
// 4. Optionally: Delete DOs not in KV (careful with this!)
```

---

## Implementation Priority

### High Priority (Cost Impact)
1. ✅ **Draft DO auto-deletion** - Users create many drafts
2. ✅ **Completed draft removal from KV** - Already tracking this

### Medium Priority (Quality of Life)
3. **Card Game DO auto-deletion for inactive games**
4. **KV cleanup cron jobs**

### Low Priority (Nice to Have)
5. **Orphan detection/repair**
6. **Manual cleanup UI in admin panel**

---

## Migration Considerations

### Backward Compatibility
- Existing DOs won't have alarms scheduled
- Need to schedule alarm on first access after deploy
- Check `alarmScheduled` flag in storage

### Testing Strategy
1. Test on sandbox games first (already have alarm support)
2. Add alarm scheduling to existing DOs on next fetch
3. Monitor logs for unexpected deletions

### Rollback Plan
- Alarms can be canceled with `deleteAlarm()`
- Keep 7-day grace period before any deletion
- Add admin override to prevent deletion

---

## Cost Savings Estimate

**Current Cost**: ~$0.02/DO/month
- 1000 abandoned drafts = $20/month
- 500 old games = $10/month

**With Cleanup**:
- Drafts deleted after 7 days (completed) or 30 days (abandoned)
- Games deleted after 60 days inactive
- **Estimated savings: $15-25/month** (grows with user base)

---

## Next Steps

1. Add alarm to DraftDO with 7/30 day deletion
2. Update draftTracking to remove completed drafts from KV after viewing
3. Add lastActivityTimestamp tracking to CardGameDO
4. Create cron cleanup jobs
5. Monitor cleanup logs for unexpected deletions
