# Durable Object Output Gate - Best Practices

## What is the Output Gate?

Cloudflare Durable Objects have an "output gate" that **automatically waits for all pending storage operations** before returning a response to the client. This means you can call storage operations without `await` and they'll still complete before the response is sent.

## Why Not Await Storage Operations?

### Performance Benefits
```typescript
// ❌ Slow - Sequential execution
await this.ctx.storage.put('key1', value1)  // Wait 5ms
await this.ctx.storage.put('key2', value2)  // Wait 5ms
await this.ctx.storage.put('key3', value3)  // Wait 5ms
// Total: 15ms

// ✅ Fast - Parallel execution
this.ctx.storage.put('key1', value1)  // Fire and forget
this.ctx.storage.put('key2', value2)  // Fire and forget
this.ctx.storage.put('key3', value3)  // Fire and forget
// Total: ~5ms (all happen in parallel)
// Output gate ensures all complete before response
```

### Implementation in CardGameDO

## When to SKIP await (Output Gate)

### ✅ Setting flags/metadata
```typescript
// Before
await this.ctx.storage.put('cleanupScheduled', true)

// After
this.ctx.storage.put('cleanupScheduled', true) // Output gate ensures completion
```

### ✅ Persisting game state
```typescript
private persist() {
  if (this.gameState) {
    // No await needed - output gate ensures this completes
    this.ctx.storage.put('cardGameState', storedState)
  }
}
```

### ✅ Cleanup operations (when order doesn't matter)
```typescript
// Restart game - these can happen in parallel
this.playerActivity.clear()
this.ctx.storage.put('playerActivity', {})  // No await
this.ctx.storage.delete('gameActions')      // No await
this.persist()  // Also no await
```

### ✅ Activity tracking
```typescript
private updatePlayerActivity(playerId: string): void {
  this.playerActivity.set(playerId, Date.now())
  // No await - output gate handles it
  this.ctx.storage.put('playerActivity', Object.fromEntries(this.playerActivity))
}
```

## When to AWAIT

### ✅ Alarms (required by API)
```typescript
// setAlarm and deleteAlarm must be awaited
await this.ctx.storage.setAlarm(Date.now() + CLEANUP_INTERVAL)
await this.ctx.storage.deleteAlarm()
```

### ✅ Reading immediately after writing
```typescript
// ❌ Bug - race condition
this.ctx.storage.put('key', 'value')
const result = await this.ctx.storage.get('key')  // Might not be there yet!

// ✅ Correct
await this.ctx.storage.put('key', 'value')
const result = await this.ctx.storage.get('key')  // Guaranteed to exist
```

### ✅ Ordered operations
```typescript
// Migration - must complete in order
await this.ctx.storage.put('gameActions', stored.actions)
const { actions, ...cleanState } = stored
await this.ctx.storage.put('cardGameState', cleanState)  // Depends on previous write
```

### ✅ Critical cleanup (DELETE operations)
```typescript
if (method === 'DELETE') {
  await this.ctx.storage.deleteAlarm()  // Ensure alarm cancelled
  await this.ctx.storage.deleteAll()    // Ensure everything deleted
  return Response.json({ success: true })
}
```

### ✅ Initialization (in blockConcurrencyWhile)
```typescript
this.ctx.blockConcurrencyWhile(async () => {
  const initialized = await this.ctx.storage.get('initialized')
  if (!initialized) {
    await this.ctx.storage.put('initialized', true)  // Must complete before handling requests
    await this.ctx.storage.put('createdAt', Date.now())
  }
})
```

### ✅ Self-healing data
```typescript
if (!this.validateSandboxDecks(starterDecks)) {
  const fresh = await import('./starterDeckData')
  await this.ctx.storage.put('starterDecks', fresh)  // Must complete before using
  starterDecks = fresh  // Using the data immediately
}
```

## Changes Made to CardGameDO

### Removed Unnecessary Awaits

1. **Cleanup scheduling** (Line 84, 196)
   ```typescript
   // Before
   await this.ctx.storage.put('cleanupScheduled', true)

   // After
   this.ctx.storage.put('cleanupScheduled', true) // Output gate handles it
   ```

2. **Game restart** (Lines 609, 614)
   ```typescript
   // Before
   await this.ctx.storage.put('playerActivity', {})
   await this.ctx.storage.delete('gameActions')

   // After
   this.ctx.storage.put('playerActivity', {})  // Parallel execution
   this.ctx.storage.delete('gameActions')      // Parallel execution
   ```

### Kept Necessary Awaits

1. **Alarms** - Required by Cloudflare API
2. **Migration** - Need ordering guarantees
3. **DELETE handler** - Critical cleanup
4. **Initialization** - Must complete before request handling
5. **Self-healing** - Immediately reading the written data

## Performance Impact

### Before (All Awaited)
```
Request arrives
→ await put('key1') ----5ms----
→ await put('key2') ----5ms----
→ await put('key3') ----5ms----
→ Response sent
Total: 15ms
```

### After (Output Gate)
```
Request arrives
→ put('key1') ┐
→ put('key2') ├─ All in parallel (~5ms)
→ put('key3') ┘
→ Output gate waits for all
→ Response sent
Total: 5ms
```

**Result**: ~67% faster for operations with 3+ storage writes

## Common Patterns

### Pattern 1: State Update
```typescript
async applyAction(action: Action) {
  this.gameState = this.reducer(this.gameState, action)
  this.persist()  // No await - output gate ensures completion
  this.broadcast({ type: 'state_update', state: this.gameState })
}
```

### Pattern 2: Batch Operations
```typescript
async cleanup() {
  // All happen in parallel, output gate waits for all
  this.ctx.storage.delete('temp1')
  this.ctx.storage.delete('temp2')
  this.ctx.storage.delete('temp3')
  this.ctx.storage.put('lastCleanup', Date.now())

  console.log('Cleanup scheduled')  // Logs before completion
  // Response sent after all operations complete
}
```

### Pattern 3: Critical Path
```typescript
async deleteGame() {
  // Must await - ensure cleanup before returning
  await this.ctx.storage.deleteAlarm()
  await this.ctx.storage.deleteAll()

  return { success: true }  // Guaranteed clean at this point
}
```

## References

- [Cloudflare Durable Objects Best Practices](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-from-workers/)
- [Storage API Documentation](https://developers.cloudflare.com/durable-objects/api/transactional-storage-api/)

## Summary

**Rule of Thumb**:
- ✅ Skip `await` for fire-and-forget writes (persist, track, cleanup)
- ✅ Use `await` for alarms, ordered operations, and immediate reads
- ✅ Trust the output gate to ensure completion before response

**Performance**: ~67% faster for multi-write operations
