# Sanctum Page Redesign Plan

## Current Issues
1. ❌ Page is bloated - all sections stacked vertically
2. ❌ No deck deletion functionality
3. ❌ Deck limits prevent testing (Free: 2, Starter: 5, Pro: 12)
4. ❌ Can't create more decks when at limit
5. ❌ No visual organization - hard to navigate

## Proposed Solution

### 1. Left Sidebar Navigation
```
┌─────────────────────────────────────────┐
│ Sidebar (20%)   │ Content Area (80%)    │
│                 │                       │
│ 🏠 Overview     │ [Selected section]    │
│ 🃏 My Decks     │                       │
│ 🎮 Card Games   │                       │
│ 🎲 Risk Games   │                       │
│ 👥 Social       │                       │
│ ⚔️ PVP Arena    │                       │
│ 📊 Stats        │                       │
│ ⚙️ Settings     │                       │
│                 │                       │
└─────────────────────────────────────────┘
```

### 2. Deck Management Improvements

#### Add Delete Functionality
- Delete button on each deck card
- Confirmation modal before deletion
- Server action: `deleteDeck(userId, deckId)`

#### Visual Changes
```typescript
// Before
<DeckCard deck={deck} />

// After
<DeckCard
  deck={deck}
  onDelete={() => handleDelete(deck.id)}
  canDelete={true}
/>
```

### 3. Testing Tier / Override System

#### Option A: Add "testing" tier
```typescript
// tiers.ts
testing: {
  id: 'testing',
  name: 'Testing',
  price: 0,
  interval: null,
  features: {
    maxGamesPerOrg: 100,
    maxPlayersPerGame: 16,
    maxDecksPerUser: 100,  // Unlimited for testing
    canUseDiscord: true,
    prioritySupport: true,
  },
  description: 'Internal testing tier',
}
```

#### Option B: User-specific override (RECOMMENDED)
```typescript
// tiers.ts
export function getUserTierOverride(userId: string): Partial<TierFeatures> | null {
  const TESTING_USERS = [
    'your-user-id-here',  // Ryan's account
  ]

  if (TESTING_USERS.includes(userId)) {
    return {
      maxDecksPerUser: 100,
      maxGamesPerOrg: 100,
      maxPlayersPerGame: 16,
    }
  }

  return null
}

export function getTierConfig(tier: SqueezeTier, userId?: string) {
  const config = SQUEEZE_TIERS[tier]

  // Apply override if exists
  const override = userId ? getUserTierOverride(userId) : null
  if (override) {
    return {
      ...config,
      features: { ...config.features, ...override }
    }
  }

  return config
}
```

### 4. New File Structure

```
src/app/pages/sanctum/
├── SanctumPage.tsx              # Main layout with sidebar
├── components/
│   ├── Sidebar.tsx              # Left navigation
│   ├── sections/
│   │   ├── OverviewSection.tsx  # Dashboard/stats
│   │   ├── DecksSection.tsx     # My Decks (with delete)
│   │   ├── CardGamesSection.tsx # Card games list
│   │   ├── RiskGamesSection.tsx # Risk games list
│   │   ├── SocialSection.tsx    # Friends/invites
│   │   ├── PvpSection.tsx       # PVP arena link
│   │   └── SettingsSection.tsx  # Account settings
│   └── DeckCard.tsx             # Reusable deck card with delete
└── types.ts                     # Section types
```

## Implementation Steps

### Phase 1: Add Deck Deletion
1. Create `deleteDeck` server action
2. Add delete button to DeckCard
3. Add confirmation modal
4. Test deletion flow

### Phase 2: Add Testing Override
1. Get your user ID from database
2. Add `getUserTierOverride()` to tiers.ts
3. Update `getTierConfig()` to use overrides
4. Test increased limits

### Phase 3: Reorganize Layout
1. Create Sidebar component
2. Break sections into separate components
3. Add routing/state for active section
4. Update SanctumPage to use new layout

### Phase 4: Polish
1. Add transitions between sections
2. Add loading states
3. Add empty states
4. Mobile responsive (sidebar collapses to hamburger)

## Code Examples

### Delete Deck Server Action
```typescript
// app/serverActions/deckBuilder/deleteDeck.ts
'use server'

import { db } from '@/db'
import { env } from 'cloudflare:workers'

export async function deleteDeck(userId: string, deckId: string) {
  try {
    // Verify ownership
    const deck = await db.deck.findUnique({
      where: { id: deckId }
    })

    if (!deck || deck.userId !== userId) {
      return { success: false, error: 'Deck not found or access denied' }
    }

    // Delete deck
    await db.deck.delete({
      where: { id: deckId }
    })

    // Also remove from KV cache
    const key = `decks:${userId}`
    // ... KV cleanup logic

    return { success: true }
  } catch (error) {
    console.error('Error deleting deck:', error)
    return { success: false, error: 'Failed to delete deck' }
  }
}
```

### Sidebar Component
```typescript
// components/Sidebar.tsx
'use client'

import { useState } from 'react'
import { Home, Package, Gamepad2, Dice6, Users, Swords, BarChart3, Settings } from 'lucide-react'

type Section = 'overview' | 'decks' | 'cardGames' | 'riskGames' | 'social' | 'pvp' | 'stats' | 'settings'

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'decks', label: 'My Decks', icon: Package },
  { id: 'cardGames', label: 'Card Games', icon: Gamepad2 },
  { id: 'riskGames', label: 'Risk Games', icon: Dice6 },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'pvp', label: 'PVP Arena', icon: Swords },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

export function Sidebar({ activeSection, onSectionChange }: {
  activeSection: Section
  onSectionChange: (section: Section) => void
}) {
  return (
    <div className="w-64 bg-slate-800 border-r-2 border-slate-600 h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-slate-600">
        <h1 className="text-2xl font-bold text-white">Sanctum</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {SECTIONS.map(section => {
            const Icon = section.icon
            const isActive = activeSection === section.id

            return (
              <li key={section.id}>
                <button
                  onClick={() => onSectionChange(section.id as Section)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{section.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-600">
        <a href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          ← Return Home
        </a>
      </div>
    </div>
  )
}
```

### DeckCard with Delete
```typescript
function DeckCard({ deck, onDelete, canDelete }: {
  deck: Deck
  onDelete: () => void
  canDelete: boolean
}) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <div className="bg-slate-700/70 rounded-lg border border-slate-600 p-4 hover:border-blue-500 transition-all">
        {/* Deck info */}
        <div className="flex justify-between items-start mb-3">
          <span className="text-lg font-bold text-white">{deck.name}</span>
          {canDelete && (
            <button
              onClick={() => setShowConfirm(true)}
              className="p-2 hover:bg-red-600/20 rounded text-red-400 hover:text-red-300 transition-colors"
              title="Delete deck"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ... rest of deck info ... */}

        <div className="flex justify-between items-center gap-2">
          <a href={`/deckBuilder/${deck.id}`} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-center">
            Edit
          </a>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <ConfirmDeleteModal
          deckName={deck.name}
          onConfirm={() => {
            onDelete()
            setShowConfirm(false)
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
```

## Timeline
- **Phase 1** (Delete functionality): 1-2 hours
- **Phase 2** (Testing override): 30 minutes
- **Phase 3** (Layout reorganization): 2-3 hours
- **Phase 4** (Polish): 1-2 hours

**Total**: ~6-8 hours of development

## Questions
1. Do you want Option A (testing tier) or Option B (user-specific override)?
2. Should sidebar be collapsible on desktop?
3. Should deck deletion also delete from any active games using that deck?
4. What should the default section be? (Overview or My Decks?)
