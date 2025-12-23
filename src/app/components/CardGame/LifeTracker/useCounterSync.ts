// app/components/CardGame/LifeTracker/useCounterSync.ts
'use client'

import { useState, useEffect } from 'react'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface Counter {
  id: string
  type: 'life' | 'commander' | 'custom'
  label: string
  value: number
  opponentId?: string
  opponentName?: string
  opponentColor?: string
}

interface GameStateData {
  counters: Record<string, number>
}

export function useCounterSync(
  player: MTGPlayer,
  opponents: MTGPlayer[],
  onCountersChange?: (gameStateInfo: string) => void
) {
    const [counters, setCounters] = useState<Counter[]>([])

    // Initialize counters from server state
    // Initialize counters from server state
    useEffect(() => {
        const initialCounters: Counter[] = [
        {
            id: 'life',
            type: 'life',
            label: 'Life',
            value: player.life
        }
        ]
    
        // Add commander damage counters
        opponents.forEach(opp => {
        initialCounters.push({
            id: `cmdr-${opp.id}`,
            type: 'commander',
            label: `Commander Damage`,
            value: 0,
            opponentId: opp.id,
            opponentName: opp.name,
            opponentColor: opp.cursorColor
        })
        })
    
        // Load from server state if exists
        if (player.gameStateInfo) {
        try {
            const serverState: GameStateData = JSON.parse(player.gameStateInfo)
            if (serverState.counters) {
            initialCounters.forEach(counter => {
                if (serverState.counters[counter.id] !== undefined) {
                counter.value = serverState.counters[counter.id]
                }
            })
            
            Object.entries(serverState.counters).forEach(([counterId, value]) => {
                if (!initialCounters.find(c => c.id === counterId) && !counterId.startsWith('cmdr-') && counterId !== 'life') {
                initialCounters.push({
                    id: counterId,
                    type: 'custom',
                    label: counterId,
                    value: value
                })
                }
            })
            }
        } catch (error) {
            console.error('Failed to parse gameStateInfo:', error)
        }
        }
    
        setCounters(initialCounters)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [player.life, player.gameStateInfo, opponents.length]) // ✅ Use opponents.length instead of opponents

    // Sync counters to server whenever they change
    useEffect(() => {
        if (counters.length === 0) return // Skip initial empty state
        
        // ✅ Only sync if we actually have a callback
        if (!onCountersChange) return
        
        const gameStateData: GameStateData = {
            counters: counters
            .filter(c => c.type !== 'life') // ✅ Don't sync life counter
            .reduce((acc, counter) => {
                acc[counter.id] = counter.value
                return acc
            }, {} as Record<string, number>)
        }
        
        onCountersChange(JSON.stringify(gameStateData))
    }, [counters])

    return { counters, setCounters }
}