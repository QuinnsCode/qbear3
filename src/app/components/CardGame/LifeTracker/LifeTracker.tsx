// app/components/CardGame/LifeTracker/LifeTracker.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'
import { useCounterSync } from './useCounterSync'

interface Counter {
  id: string
  type: 'life' | 'commander' | 'custom'
  label: string
  value: number
  opponentId?: string
  opponentName?: string
  opponentColor?: string
}

interface Props {
  player: MTGPlayer
  opponents: MTGPlayer[]
  onLifeChange: (newLife: number) => void
  onCountersChange?: (gameStateInfo: string) => void
  onClose: () => void
}

const PRESET_COUNTERS = [
  { id: 'storm', label: '⛈️ Storm', icon: '⛈️' },
  { id: 'energy', label: '⚡ Energy', icon: '⚡' },
  { id: 'experience', label: '✨ Experience', icon: '✨' },
  { id: 'poison', label: '☠️ Poison', icon: '☠️' },
  { id: 'treasure', label: '💰 Treasure', icon: '💰' },
  { id: 'food', label: '🍎 Food', icon: '🍎' },
  { id: 'clue', label: '🔍 Clue', icon: '🔍' },
]

export default function LifeTracker({ player, opponents, onLifeChange, onCountersChange, onClose }: Props) {
  const { counters, setCounters } = useCounterSync(player, opponents, onCountersChange)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAddCounter, setShowAddCounter] = useState(false)
  const [customCounterName, setCustomCounterName] = useState('')
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Swipe detection
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentIndex < counters.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleCounterChange = (delta: number) => {
    const counter = counters[currentIndex]
    const newValue = Math.max(0, counter.value + delta)

    if (counter.type === 'life') {
      onLifeChange(newValue)
    } else {
      setCounters(prev => prev.map(c => 
        c.id === counter.id ? { ...c, value: newValue } : c
      ))
    }
  }

  const handleSetValue = (value: number) => {
    const counter = counters[currentIndex]

    if (counter.type === 'life') {
      onLifeChange(value)
    } else {
      setCounters(prev => prev.map(c => 
        c.id === counter.id ? { ...c, value } : c
      ))
    }
  }

  const addCustomCounter = (preset?: typeof PRESET_COUNTERS[0]) => {
    const newCounter: Counter = {
      id: crypto.randomUUID(),
      type: 'custom',
      label: preset ? preset.label : customCounterName || 'Custom',
      value: 0
    }

    setCounters(prev => [...prev, newCounter])
    setShowAddCounter(false)
    setCustomCounterName('')
    setCurrentIndex(counters.length)
  }

  const deleteCounter = (counterId: string) => {
    setCounters(prev => prev.filter(c => c.id !== counterId))
    if (currentIndex >= counters.length - 1) {
      setCurrentIndex(Math.max(0, counters.length - 2))
    }
  }

  const currentCounter = counters[currentIndex]

  if (!currentCounter) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Dot indicators at top */}
      <div className="flex gap-2 justify-center pt-8 pb-4">
        {counters.map((counter, idx) => (
          <button
            key={counter.id}
            onClick={() => setCurrentIndex(idx)}
            className={`transition-all ${
              idx === currentIndex 
                ? 'w-8 h-2 bg-white rounded-full' 
                : 'w-2 h-2 bg-slate-600 rounded-full hover:bg-slate-500'
            }`}
          />
        ))}
      </div>

      {/* Swipeable content area */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex-1 flex items-center justify-center px-8"
      >
        <div className="w-full max-w-md">
          {/* Counter label */}
          <div className="text-center mb-8">
            {currentCounter.type === 'life' && (
              <h2 className="text-white text-2xl font-bold">Your Life Total</h2>
            )}
            
            {currentCounter.type === 'commander' && (
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-white text-xl font-bold">Commander Damage</h2>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white"
                    style={{ backgroundColor: currentCounter.opponentColor }}
                  />
                  <span className="text-slate-300 text-lg">{currentCounter.opponentName}</span>
                </div>
              </div>
            )}
            
            {currentCounter.type === 'custom' && (
              <h2 className="text-white text-2xl font-bold">{currentCounter.label}</h2>
            )}
          </div>

          {/* Big counter value */}
          <div 
            className="text-center mb-12 text-8xl font-bold transition-all duration-200"
            style={{
              color: currentCounter.type === 'life' ? '#10B981' 
                   : currentCounter.type === 'commander' ? '#EF4444'
                   : '#3B82F6',
              textShadow: `0 0 40px ${
                currentCounter.type === 'life' ? '#10B98140' 
                : currentCounter.type === 'commander' ? '#EF444440'
                : '#3B82F640'
              }`
            }}
          >
            {currentCounter.value}
          </div>

          {/* +/- buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => handleCounterChange(-1)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 border-2 border-red-500 text-white rounded-xl py-6 text-4xl font-bold transition-colors active:scale-95"
              style={{
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
              }}
            >
              −
            </button>
            <button
              onClick={() => handleCounterChange(1)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 border-2 border-green-500 text-white rounded-xl py-6 text-4xl font-bold transition-colors active:scale-95"
              style={{
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
              }}
            >
              +
            </button>
          </div>

          {/* Quick adjustment buttons */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[-5, -1, +1, +5].map(val => (
              <button
                key={val}
                onClick={() => handleCounterChange(val)}
                className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded-lg py-3 text-sm font-semibold transition-colors"
              >
                {val > 0 ? `+${val}` : val}
              </button>
            ))}
          </div>

          {/* Set value input */}
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              placeholder="Set value..."
              className="flex-1 bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-3 text-center text-lg focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = parseInt(e.currentTarget.value)
                  if (!isNaN(value)) {
                    handleSetValue(value)
                    e.currentTarget.value = ''
                  }
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement
                const value = parseInt(input.value)
                if (!isNaN(value)) {
                  handleSetValue(value)
                  input.value = ''
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 font-semibold transition-colors"
            >
              Set
            </button>
          </div>

          {/* Delete custom counter */}
          {currentCounter.type === 'custom' && (
            <button
              onClick={() => {
                if (confirm(`Delete "${currentCounter.label}" counter?`)) {
                  deleteCounter(currentCounter.id)
                }
              }}
              className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500 text-red-400 rounded-lg py-3 text-sm font-semibold transition-colors"
            >
              Delete Counter
            </button>
          )}
        </div>
      </div>

      {/* Add counter button at bottom */}
      <div className="p-6">
        {!showAddCounter ? (
          <button
            onClick={() => setShowAddCounter(true)}
            className="w-full bg-slate-800 hover:bg-slate-700 border-2 border-dashed border-slate-600 text-white rounded-lg py-4 font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-2xl">+</span>
            <span>Add Counter</span>
          </button>
        ) : (
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
            <h3 className="text-white font-bold mb-3">Add Counter</h3>
            
            {/* Preset counters */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {PRESET_COUNTERS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => addCustomCounter(preset)}
                  className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom name input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customCounterName}
                onChange={(e) => setCustomCounterName(e.target.value)}
                placeholder="Custom counter name..."
                className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => customCounterName && addCustomCounter()}
                disabled={!customCounterName}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg px-4 text-sm font-semibold transition-colors"
              >
                Add
              </button>
            </div>

            <button
              onClick={() => setShowAddCounter(false)}
              className="w-full mt-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}