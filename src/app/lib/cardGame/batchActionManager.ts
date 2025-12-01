type BatchedAction = {
    type: string
    playerId: string
    data: any
  }
  
  class BatchActionManager {
    private queue: Map<string, BatchedAction[]> = new Map()
    private flushTimers: Map<string, NodeJS.Timeout> = new Map()
    private readonly BATCH_DELAY = 100 // 100ms = 10fps
    private readonly MAX_BATCH_SIZE = 10
  
    async queueAction(
      cardGameId: string,
      action: BatchedAction,
      executor: (actions: BatchedAction[]) => Promise<void>
    ) {
      // Get or create queue for this game
      if (!this.queue.has(cardGameId)) {
        this.queue.set(cardGameId, [])
      }
  
      const gameQueue = this.queue.get(cardGameId)!
      gameQueue.push(action)
  
      console.log(`📦 Queued action (${gameQueue.length} in queue):`, action.type)
  
      // Flush if batch is full
      if (gameQueue.length >= this.MAX_BATCH_SIZE) {
        this.flush(cardGameId, executor)
        return
      }
  
      // Reset timer
      if (this.flushTimers.has(cardGameId)) {
        clearTimeout(this.flushTimers.get(cardGameId)!)
      }
  
      // Schedule flush
      const timer = setTimeout(() => {
        this.flush(cardGameId, executor)
      }, this.BATCH_DELAY)
  
      this.flushTimers.set(cardGameId, timer)
    }
  
    private async flush(
      cardGameId: string,
      executor: (actions: BatchedAction[]) => Promise<void>
    ) {
      const gameQueue = this.queue.get(cardGameId)
      if (!gameQueue || gameQueue.length === 0) return
  
      console.log(`🚀 Flushing ${gameQueue.length} actions for game ${cardGameId}`)
  
      // Clear queue and timer
      this.queue.set(cardGameId, [])
      if (this.flushTimers.has(cardGameId)) {
        clearTimeout(this.flushTimers.get(cardGameId)!)
        this.flushTimers.delete(cardGameId)
      }
  
      // Execute batch
      try {
        await executor(gameQueue)
      } catch (error) {
        console.error('Failed to flush batch:', error)
      }
    }
  
    // Force immediate flush (e.g., on mouse up)
    async flushImmediate(
      cardGameId: string,
      executor: (actions: BatchedAction[]) => Promise<void>
    ) {
      if (this.flushTimers.has(cardGameId)) {
        clearTimeout(this.flushTimers.get(cardGameId)!)
        this.flushTimers.delete(cardGameId)
      }
      await this.flush(cardGameId, executor)
    }
  }
  
  // Singleton instance
  export const batchActionManager = new BatchActionManager()