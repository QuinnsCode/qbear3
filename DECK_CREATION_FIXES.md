# Deck Creation Flow Fixes

## Issues Reported
1. Card images not fetching/displaying
2. All cards being sorted under "other" category instead of proper categories (creatures, lands, artifacts, etc.)

## Root Causes

### Issue 1: Missing Card Images
**Problem**: The deck builder expects cards to have a flat `imageUrl` field (string), but the code was only setting `image_uris` (object structure) from Scryfall data.

**Location**: `src/app/serverActions/deckBuilder/deckActions.ts` - `parseDeckAndFetchCards()` function

**Details**:
- When converting `CardData` to `ScryfallCard` format, only the nested `image_uris` object was populated
- The `DeckCard` type expects `imageUrl?: string` for display
- Cards were being created without the `imageUrl` field, causing images to fail loading

### Issue 2: Cards Categorized as "Other"
**Problem**: The card categorization function looks for a `type` field, but cards only had `type_line`.

**Location**:
- Categorization: `src/app/components/CardGame/DeckBuilder/DeckListView.tsx` - `categorizeCard()` function
- Data creation: `src/app/serverActions/deckBuilder/deckActions.ts`

**Details**:
- `categorizeCard()` checks `card.type?.toLowerCase()` to categorize cards
- But `ScryfallCard` only had `type_line` field (snake_case from Scryfall API)
- When `card.type` is undefined, all cards fall into the "other" category

## Fixes Applied

### Fix 1: Add `imageUrl` Field to Cards
**File**: `src/app/serverActions/deckBuilder/deckActions.ts` (lines 109-140)

Added extraction of flat `imageUrl` from the nested `image_uris` object:

```typescript
// Extract imageUrl with fallback priority: normal → large → small
const imageUrl = cardData.imageUris?.normal || cardData.imageUris?.large || cardData.imageUris?.small || ''

const scryfallCard: ScryfallCard = {
  // ... existing fields

  // Add flat fields for deck builder (DeckCard type compatibility)
  imageUrl: imageUrl,
  type: cardData.typeLine,
  manaCost: cardData.manaCost,
  cmc: cardData.cmc,
}
```

**Fallback priority**:
1. `normal` - Best for display (default)
2. `large` - Fallback if normal not available
3. `small` - Last resort
4. Empty string - If no images available

### Fix 2: Add `type` Field for Categorization
**File**: `src/app/serverActions/deckBuilder/deckActions.ts`

Added `type` field that maps from `typeLine`:

```typescript
type: cardData.typeLine,  // Deck builder categorization needs 'type' field
```

This allows the categorization function to properly check:
- `type.includes('creature')` → "creatures"
- `type.includes('land')` → "lands"
- `type.includes('artifact')` → "artifacts"
- `type.includes('enchantment')` → "enchantments"
- `type.includes('instant')` → "instants"
- `type.includes('sorcery')` → "sorceries"
- `type.includes('planeswalker')` → "planeswalkers"

### Fix 3: Update ScryfallCard Type Definition
**File**: `src/app/services/cardGame/CardGameState.ts` (lines 137-178)

Added optional fields for deck builder compatibility:

```typescript
export type ScryfallCard = {
  // ... existing fields

  // Deck builder compatibility fields (flat structure)
  imageUrl?: string      // Flattened from image_uris.normal
  type?: string          // Alias for type_line (for categorization)
  manaCost?: string      // Alias for mana_cost (camelCase)
  cmc?: number           // Converted mana cost
}
```

**Benefits**:
- Type safety (no need for `as any` assertions)
- Clear documentation of dual-purpose fields
- Maintains backward compatibility with existing code

## Testing Checklist

- [ ] Create a new deck with various card types
  - [ ] Creatures display in "Creatures" section
  - [ ] Lands display in "Lands" section
  - [ ] Artifacts display in "Artifacts" section
  - [ ] Instants/Sorceries display correctly
  - [ ] Planeswalkers display correctly
- [ ] Card images load correctly
  - [ ] Card images show in deck list view
  - [ ] Commander images show in deck header
  - [ ] Images persist after page reload
- [ ] Edit existing deck
  - [ ] Cards maintain correct categories
  - [ ] Images remain visible
- [ ] Import deck from text list
  - [ ] All cards fetch images
  - [ ] Cards categorized correctly

## Files Changed

1. **src/app/serverActions/deckBuilder/deckActions.ts**
   - Added `imageUrl`, `type`, `manaCost`, `cmc` fields when creating cards
   - Ensures compatibility with DeckCard interface

2. **src/app/services/cardGame/CardGameState.ts**
   - Updated `ScryfallCard` type to include deck builder compatibility fields
   - Added documentation comments

## Data Flow

```
User imports deck list
  ↓
parseDeckList() - Parse text to card names
  ↓
getCardsByIdentifiers() - Fetch from Scryfall (with KV cache)
  ↓
CardData objects (from Scryfall provider)
  ↓
Convert to ScryfallCard format
  ├─ Set image_uris (nested object)
  ├─ Set type_line (snake_case)
  └─ ADD: imageUrl, type, manaCost, cmc (flat fields) ← FIX
  ↓
Store in DECKS_KV
  ↓
Display in DeckListView
  ├─ categorizeCard() uses 'type' field ← NOW WORKS
  └─ Card images use 'imageUrl' field ← NOW WORKS
```

## Notes

- The fix maintains backward compatibility - old deck data will still work
- Deck migration system will handle any legacy decks
- The `updateDeckFromEditor` function already preserved these fields correctly
- Commander image URLs are extracted from the `imageUrl` field of commander cards

## Related Files

- `src/app/types/Deck.ts` - DeckCard interface definition
- `src/app/components/CardGame/DeckBuilder/DeckListView.tsx` - Categorization logic
- `src/app/services/cardData/types.ts` - CardData interface (from Scryfall provider)
