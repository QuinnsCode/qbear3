# Card Fetching System - Complete Fix Report

## Issues Identified

1. ✅ **Commander images showing** - Working correctly
2. ❌ **Cannot delete decks** - deleteDeck.ts tries to use non-existent database table
3. ❌ **Individual cards not displaying information** - Data structure inconsistency
4. ❌ **Missing `format` field** - DeckV4 requires format but wasn't being set

## Root Causes

### 1. Delete Function Using Wrong Storage
**File**: `src/app/serverActions/deckBuilder/deleteDeck.ts`

**Problem**: This file tries to delete from Prisma database table `deck`, but NO such table exists in the schema. Decks are stored ONLY in KV, not in the database.

**Evidence**:
```bash
# No Deck model in Prisma schema
grep -r "model.*Deck" prisma/  # Returns nothing
```

**Impact**: When `DecksSectionClient.tsx` imported from `deleteDeck.ts`, deletion failed because it tried to access `db.deck` which doesn't exist.

### 2. Data Structure Inconsistency

**Problem**: Cards have BOTH nested structure (from Scryfall API) AND flat fields (for deck builder UI), but different parts of the code expect different structures.

**Scryfall API Format** (snake_case):
```typescript
{
  image_uris: { normal: "url", large: "url", small: "url", art_crop: "url" },
  type_line: "Creature — Human Wizard",
  mana_cost: "{2}{U}{U}"
}
```

**Deck Builder Expected Format** (flat fields):
```typescript
{
  imageUrl: "url",  // Flattened from image_uris.normal
  type: "Creature — Human Wizard",  // Flattened from type_line
  manaCost: "{2}{U}{U}",  // Flattened from mana_cost
  cmc: 4
}
```

**Where conversion happens**: `src/app/serverActions/deckBuilder/deckActions.ts` lines 109-140

### 3. Missing Format Field

**File**: `src/app/serverActions/deckBuilder/deckActions.ts` line 242

**Problem**: DeckV4 type requires `format: 'commander' | 'draft'`, but deck creation wasn't setting it.

## Fixes Applied

### Fix 1: Use Correct Delete Function ✅

**File**: `src/app/pages/sanctum/components/sections/DecksSectionClient.tsx`

**Changed**:
```typescript
// BEFORE (wrong - tries to use non-existent DB table)
import { deleteDeck } from '@/app/serverActions/deckBuilder/deleteDeck'

// AFTER (correct - uses KV storage)
import { deleteDeck } from '@/app/serverActions/deckBuilder/deckActions'
```

**Why**: The correct delete function is in `deckActions.ts` which only uses KV storage. The `deleteDeck.ts` file is incorrect and should be removed or fixed.

### Fix 2: Add Missing Format Field ✅

**File**: `src/app/serverActions/deckBuilder/deckActions.ts` line 241-253

**Changed**:
```typescript
const deck: Deck = {
  version: CURRENT_DECK_VERSION, // = 4
  id: `deck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: deckName,
  format: 'commander',  // ✅ ADDED - Required for DeckV4
  commanders: parseAndFetchResult.commanders || [],
  commanderImageUrls: commanderImageUrls.length > 0 ? commanderImageUrls : undefined,
  colors,
  cards: deckCards,
  totalCards,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}
```

### Fix 3: Add Flat Fields to ScryfallCard Type ✅

**File**: `src/app/services/cardGame/CardGameState.ts` lines 170-178

**Added**:
```typescript
export type ScryfallCard = {
  // ... existing fields ...

  // Deck builder compatibility fields (flat structure)
  imageUrl?: string      // Flattened from image_uris.normal
  type?: string          // Alias for type_line (for categorization)
  manaCost?: string      // Alias for mana_cost (camelCase)
  cmc?: number           // Converted mana cost
}
```

### Fix 4: Populate Flat Fields During Card Creation ✅

**File**: `src/app/serverActions/deckBuilder/deckActions.ts` lines 109-140

**Changed**:
```typescript
const imageUrl = cardData.imageUris?.normal || cardData.imageUris?.large || cardData.imageUris?.small || ''

const scryfallCard: ScryfallCard = {
  id: cardData.id,
  name: cardData.name,
  mana_cost: cardData.manaCost,
  type_line: cardData.typeLine,
  oracle_text: cardData.oracleText,
  power: cardData.power,
  toughness: cardData.toughness,
  colors: cardData.colors,
  color_identity: cardData.colorIdentity,
  image_uris: cardData.imageUris ? {
    small: cardData.imageUris.small,
    normal: cardData.imageUris.normal,
    large: cardData.imageUris.large,
    art_crop: cardData.imageUris.artCrop,
  } : undefined,
  set: cardData.setCode,
  set_name: cardData.setName,
  collector_number: cardData.collectorNumber,
  rarity: cardData.rarity,
  legalities: cardData.legalities,

  // ✅ ADDED: Flat fields for deck builder (DeckCard type compatibility)
  imageUrl: imageUrl,
  type: cardData.typeLine,
  manaCost: cardData.manaCost,
  cmc: cardData.cmc,
}
```

### Fix 5: Add Fallback Logic for Old Deck Data ✅

**File**: `src/app/components/CardGame/DeckBuilder/EditDeckModal.tsx` lines 108-123

**Changed**:
```typescript
const [cards, setCards] = useState<DeckCard[]>(
  (deck.cards || []).map(card => {
    // Handle both flat fields (new) and nested fields (old format) for backward compatibility
    const cardAny = card as any

    return {
      id: card.id || '',
      scryfallId: card.scryfallId || card.id || '',
      name: card.name || 'Unknown Card',
      quantity: card.quantity || 1,
      imageUrl: card.imageUrl || cardAny.image_uris?.normal || cardAny.image_uris?.large || '',  // ✅ Fallback
      type: card.type || cardAny.type_line || '',  // ✅ Fallback
      manaCost: card.manaCost || cardAny.mana_cost || '',  // ✅ Fallback
      colors: card.colors || [],
      zone: (card.zone || (card.isCommander ? 'commander' : 'main')) as CardZone,
      cmc: cardAny.cmc || parseManaValue(card.manaCost || cardAny.mana_cost || ''),  // ✅ Fallback
      rarity: cardAny.rarity || 'common'
    }
  })
)
```

**Why**: This ensures that both old decks (with only nested fields) and new decks (with flat fields) will work correctly.

## Data Flow Diagram

```
User Imports Deck List
  ↓
parseDeckList() → Parse text to card names
  ↓
getCardsByIdentifiers() → Fetch from Scryfall API
  ↓
CardData (camelCase) from KV cache or API
  {
    imageUris: { normal, large, small, artCrop },
    typeLine: "Creature — Human",
    manaCost: "{2}{U}"
  }
  ↓
Convert to ScryfallCard (BOTH formats)
  {
    // Nested (Scryfall format - snake_case)
    image_uris: { normal, large, small, art_crop },
    type_line: "Creature — Human",
    mana_cost: "{2}{U}",

    // Flat (Deck builder format)
    imageUrl: "url",  ← ADDED
    type: "Creature — Human",  ← ADDED
    manaCost: "{2}{U}",  ← ADDED
    cmc: 3  ← ADDED
  }
  ↓
Store in KV as part of Deck
  ↓
Load in EditDeckModal with fallback logic
  ↓
Display correctly with all information
```

## Files Changed

| File | Change | Purpose |
|------|--------|---------|
| `src/app/serverActions/deckBuilder/deckActions.ts` | Added `format: 'commander'` | Fix DeckV4 type requirement |
| `src/app/serverActions/deckBuilder/deckActions.ts` | Added flat fields to ScryfallCard creation | Ensure cards have imageUrl, type, manaCost, cmc |
| `src/app/services/cardGame/CardGameState.ts` | Added flat fields to ScryfallCard type | Type safety for new fields |
| `src/app/pages/sanctum/components/sections/DecksSectionClient.tsx` | Changed import from deleteDeck.ts to deckActions.ts | Use correct delete function (KV-based) |
| `src/app/components/CardGame/DeckBuilder/EditDeckModal.tsx` | Added fallback logic | Support both old and new deck formats |

## Files to Remove/Fix

**File**: `src/app/serverActions/deckBuilder/deleteDeck.ts`

**Issue**: Tries to use `db.deck` table which doesn't exist

**Options**:
1. **Delete it** - Not used anywhere except DecksSectionClient (now fixed)
2. **Fix it** - Remove DB code, only use KV (same as deckActions.ts version)
3. **Leave it** - Document that it's incorrect

**Current imports**:
- ✅ `DecksSectionClient.tsx` - Fixed to use deckActions.ts
- ❌ `DeckBuilderPage.tsx` - Still imports from deckActions.ts (correct)
- ❌ `DeckBuilder.tsx` - Still imports from deckActions.ts (correct)
- ❌ `exportPvpDeck.ts` - Still imports from deckActions.ts (correct)
- ❌ `CardGameBoard.tsx` - Still imports from deckActions.ts (correct)

**Recommendation**: Delete `deleteDeck.ts` since it's now unused and incorrect.

## Storage Architecture

### Decks are stored in:
- ✅ **KV Storage** (`DECKS_KV`)
  - Key: `deck:${userId}:${deckId}`
  - Value: Full Deck object (JSON)
  - TTL: 90 days

### Decks are NOT stored in:
- ❌ **Prisma Database** - No `Deck` model exists

### Card Data is cached in:
- ✅ **KV Storage** (`CARDS_KV`)
  - Key: `card:${cardId}`
  - Value: CardData object (JSON)
  - Provider: Scryfall

## Testing Checklist

### Deck Deletion
- [ ] Delete a deck from Sanctum decks section
- [ ] Verify deck is removed from KV
- [ ] Verify deck list updates
- [ ] Check no errors in console

### Deck Creation
- [ ] Create new deck with text import
- [ ] Verify `format: 'commander'` is set
- [ ] Verify all cards have:
  - [ ] imageUrl (flat field)
  - [ ] type (flat field)
  - [ ] manaCost (flat field)
  - [ ] cmc (flat field)
  - [ ] image_uris (nested object)
  - [ ] type_line (nested field)
  - [ ] mana_cost (nested field)

### Card Display
- [ ] Open deck in editor
- [ ] Verify all card images load
- [ ] Verify cards categorized correctly:
  - [ ] Creatures → Creatures section
  - [ ] Lands → Lands section
  - [ ] Artifacts → Artifacts section
  - [ ] etc.
- [ ] Verify card information displays:
  - [ ] Name
  - [ ] Type
  - [ ] Mana cost
  - [ ] Card text
  - [ ] Rarity

### Backward Compatibility
- [ ] Load old deck (before fixes)
- [ ] Verify fallback logic extracts:
  - [ ] imageUrl from image_uris.normal
  - [ ] type from type_line
  - [ ] manaCost from mana_cost
  - [ ] cmc calculated from mana_cost

## Debug Commands

```bash
# Check if Deck model exists in Prisma
grep -r "model.*Deck" prisma/

# Check KV storage for a deck
npx wrangler kv:key get "deck:USER_ID:DECK_ID" --binding=DECKS_KV

# Check KV storage for a card
npx wrangler kv:key get "card:CARD_ID" --binding=CARDS_KV

# List all decks for a user
npx wrangler kv:key get "deck:USER_ID:list" --binding=DECKS_KV
```

## Summary

All fixes have been applied to:
1. ✅ Use correct delete function (KV-based, not DB-based)
2. ✅ Add missing `format` field to deck creation
3. ✅ Add flat fields to ScryfallCard type
4. ✅ Populate flat fields during card conversion
5. ✅ Add fallback logic for backward compatibility

**Expected Result**: Decks should now:
- Delete correctly
- Display all card images
- Categorize cards properly
- Show all card information
- Work with both old and new deck data

## Next Steps

1. Test deck creation with new account
2. Test deck deletion
3. Verify card images and information display
4. Consider removing `deleteDeck.ts` file (now unused and incorrect)
5. Monitor for any remaining issues
