// app/pages/sanctum/components/sections/AnnouncementsSectionClient.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Megaphone } from 'lucide-react'

interface Feature {
  id: string
  category: string
  items: string[]
}

interface Props {
  features: Feature[]
}

export function AnnouncementsSectionClient({ features }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(features.map(f => f.id)) // Start with all expanded
  )

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <Megaphone className="w-12 h-12 text-white" />
          <div>
            <h1 className="text-3xl font-bold text-white">What You Can Do</h1>
            <p className="text-purple-100 mt-1">Explore all features available in QNTBR</p>
          </div>
        </div>
      </div>

      {/* Feature Categories */}
      <div className="space-y-4">
        {features.map(feature => {
          const isExpanded = expandedCategories.has(feature.id)

          return (
            <div
              key={feature.id}
              className="bg-slate-800 rounded-lg border-2 border-slate-600 shadow-lg overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(feature.id)}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-700/50 transition-colors"
              >
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span>{feature.category}</span>
                  <span className="text-sm font-normal text-slate-400">
                    ({feature.items.length})
                  </span>
                </h2>
                {isExpanded ? (
                  <ChevronUp className="w-6 h-6 text-slate-400" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-slate-400" />
                )}
              </button>

              {/* Feature Items */}
              {isExpanded && (
                <div className="px-6 pb-6">
                  <ul className="space-y-3">
                    {feature.items.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600"
                      >
                        <span className="text-green-400 font-bold flex-shrink-0 mt-0.5">✓</span>
                        <span className="text-gray-200">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/deckBuilder"
            className="block p-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold text-center transition-colors"
          >
            🃏 Build a Deck
          </a>
          <a
            href="/cardGame"
            className="block p-4 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold text-center transition-colors"
          >
            🎮 Start a Game
          </a>
          <a
            href="/pvp"
            className="block p-4 bg-red-600 hover:bg-red-500 rounded-lg text-white font-semibold text-center transition-colors"
          >
            ⚔️ Enter PVP Arena
          </a>
        </div>
      </div>
    </div>
  )
}
