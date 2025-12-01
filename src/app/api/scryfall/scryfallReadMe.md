# Scryfall MTG API Integration

This integration provides a complete TypeScript client for the Scryfall Magic: The Gathering API, following the same architectural pattern as your ShipStation integration.

## File Structure

```
src/app/api/scryfall/
├── scryfallTypes.ts   # Complete TypeScript type definitions for Scryfall API
└── scryfall.ts        # Client implementation and API route handler
```

## Features

- **Complete Type Safety**: Comprehensive TypeScript types for all Scryfall API objects
- **Rate Limiting**: Built-in rate limiting (100ms between requests) to respect Scryfall's 10 req/sec limit
- **Unified Client**: `ScryfallClient` class for direct use or through the API handler
- **RESTful Routes**: Clean API routes matching Scryfall's structure
- **Error Handling**: Proper error handling with typed error responses

## API Coverage

### Cards API
- Search cards with full-text queries
- Get cards by various identifiers (ID, set/number, multiverse ID, MTGO, Arena, TCGplayer, Cardmarket)
- Named card search (exact and fuzzy)
- Autocomplete card names
- Random cards
- Collection/batch requests

### Sets API
- List all sets
- Get sets by code, ID, or TCGplayer ID

### Rulings API
- Get rulings for cards by any identifier

### Symbology API
- Get all mana symbols
- Parse mana costs

### Catalog API
- Card names, artist names, word bank
- Creature types, planeswalker types, land types, etc.
- Powers, toughnesses, loyalties, watermarks
- Keyword abilities, actions, and ability words

### Bulk Data API
- Access bulk data downloads
- Get bulk data by ID or type

## Usage Examples

### Direct Client Usage

```typescript
import { ScryfallClient } from '@/app/api/scryfall/scryfall';

// Create a client instance
const client = new ScryfallClient();

// Search for cards
const results = await client.searchCards({
  q: 'c:blue cmc:3 type:creature',
  order: 'cmc',
  unique: 'cards'
});

// Get a specific card by name
const card = await client.getNamedCard({
  exact: 'Black Lotus'
});

// Get a card by set and collector number
const cardBySet = await client.getCardBySetAndNumber('neo', '123');

// Get random card matching criteria
const randomCard = await client.getRandomCard({
  q: 'c:red type:legendary'
});

// Get multiple cards at once
const collection = await client.getCollection([
  { name: 'Lightning Bolt' },
  { set: 'neo', collector_number: '123' },
  { id: '0a9b6d58-93d8-454b-8e0f-c82e545e3699' }
]);

// Get all sets
const sets = await client.listSets();

// Get rulings for a card
const rulings = await client.getRulings(cardId);

// Autocomplete card names
const suggestions = await client.autocomplete({ q: 'thal' });

// Parse mana cost
const parsed = await client.parseMana('{2}{U}{U}');
```

### API Routes

The handler supports RESTful routes that map to the Scryfall API:

#### Cards

```bash
# Search cards
GET /api/scryfall/cards/search?q=c:blue+cmc:3

# Get card by ID
GET /api/scryfall/cards/{id}

# Get card by set and collector number
GET /api/scryfall/cards/{set}/{number}

# Get card by multiverse ID
GET /api/scryfall/cards/multiverse/{id}

# Get card by MTGO ID
GET /api/scryfall/cards/mtgo/{id}

# Get card by Arena ID
GET /api/scryfall/cards/arena/{id}

# Get card by TCGplayer ID
GET /api/scryfall/cards/tcgplayer/{id}

# Get card by Cardmarket ID
GET /api/scryfall/cards/cardmarket/{id}

# Named card search
GET /api/scryfall/cards/named?exact=Black+Lotus
GET /api/scryfall/cards/named?fuzzy=ral+zarek

# Autocomplete
GET /api/scryfall/cards/autocomplete?q=thal

# Random card
GET /api/scryfall/cards/random
GET /api/scryfall/cards/random?q=c:red+type:legendary

# Collection (batch request)
POST /api/scryfall/cards/collection
{
  "identifiers": [
    { "name": "Lightning Bolt" },
    { "set": "neo", "collector_number": "123" }
  ]
}

# Get rulings
GET /api/scryfall/cards/{id}/rulings
GET /api/scryfall/cards/{set}/{number}/rulings
GET /api/scryfall/cards/multiverse/{id}/rulings
```

#### Sets

```bash
# List all sets
GET /api/scryfall/sets

# Get set by code
GET /api/scryfall/sets/{code}

# Get set by ID
GET /api/scryfall/sets/{id}

# Get set by TCGplayer ID
GET /api/scryfall/sets/tcgplayer/{id}
```

#### Symbology

```bash
# Get all mana symbols
GET /api/scryfall/symbology

# Parse mana cost
GET /api/scryfall/symbology/parse-mana?cost={2}{U}{U}
```

#### Catalogs

```bash
# Available catalog endpoints:
GET /api/scryfall/catalog/card-names
GET /api/scryfall/catalog/artist-names
GET /api/scryfall/catalog/word-bank
GET /api/scryfall/catalog/creature-types
GET /api/scryfall/catalog/planeswalker-types
GET /api/scryfall/catalog/land-types
GET /api/scryfall/catalog/artifact-types
GET /api/scryfall/catalog/enchantment-types
GET /api/scryfall/catalog/spell-types
GET /api/scryfall/catalog/powers
GET /api/scryfall/catalog/toughnesses
GET /api/scryfall/catalog/loyalties
GET /api/scryfall/catalog/watermarks
GET /api/scryfall/catalog/keyword-abilities
GET /api/scryfall/catalog/keyword-actions
GET /api/scryfall/catalog/ability-words
```

#### Bulk Data

```bash
# List all bulk data
GET /api/scryfall/bulk-data

# Get bulk data by ID
GET /api/scryfall/bulk-data/{id}

# Get bulk data by type
GET /api/scryfall/bulk-data/{type}
# Types: oracle_cards, unique_artwork, default_cards, all_cards, rulings
```

### React Server Components

```typescript
// In a React Server Component
import { ScryfallClient } from '@/app/api/scryfall/scryfall';

export default async function CardSearch({ searchQuery }: { searchQuery: string }) {
  const client = new ScryfallClient();
  const results = await client.searchCards({ q: searchQuery });

  return (
    <div>
      {results.data.map(card => (
        <div key={card.id}>
          <h3>{card.name}</h3>
          <p>{card.type_line}</p>
          {card.image_uris && (
            <img src={card.image_uris.normal} alt={card.name} />
          )}
        </div>
      ))}
    </div>
  );
}
```

### Server Actions

```typescript
'use server'

import { ScryfallClient } from '@/app/api/scryfall/scryfall';

export async function searchCards(query: string) {
  const client = new ScryfallClient();
  const results = await client.searchCards({ q: query });
  return results.data;
}

export async function getCardDetails(cardId: string) {
  const client = new ScryfallClient();
  return await client.getCard(cardId);
}
```

## Search Query Syntax

Scryfall uses a powerful search syntax. Here are some examples:

```typescript
// Find all blue creatures with CMC 3
await client.searchCards({ q: 'c:blue cmc:3 type:creature' });

// Find legendary dragons
await client.searchCards({ q: 'type:legendary type:dragon' });

// Find cards with specific text
await client.searchCards({ q: 'o:"draw a card"' });

// Find expensive cards
await client.searchCards({ q: 'usd>50' });

// Find cards in a specific set
await client.searchCards({ q: 'set:neo' });

// Complex queries
await client.searchCards({ 
  q: 'c:blue cmc<=3 (type:instant OR type:sorcery) -banned:standard',
  order: 'edhrec',
  dir: 'desc'
});
```

See [Scryfall's search reference](https://scryfall.com/docs/syntax) for complete syntax documentation.

## Type Definitions

All Scryfall API types are fully typed in `scryfallTypes.ts`:

```typescript
import type { 
  Card, 
  Set, 
  Ruling,
  ScryfallList,
  SearchParams 
} from '@/app/api/scryfall/scryfallTypes';
```

Key types include:
- `Card` - Complete card object with all fields
- `CardFace` - Individual faces of multi-faced cards
- `Set` - Set information
- `Ruling` - Card rulings
- `ScryfallList<T>` - Paginated list response
- `SearchParams` - Search query parameters
- `Legalities` - Format legality information
- `ImageUris` - Card image URLs at different sizes
- `Prices` - Card prices in various currencies

## Rate Limiting

The client automatically enforces rate limiting to respect Scryfall's limit of 10 requests per second (100ms delay between requests). This happens transparently - you don't need to handle it yourself.

## Error Handling

```typescript
try {
  const card = await client.getCard('invalid-id');
} catch (error) {
  console.error('Scryfall API error:', error);
  // Error will include status code and details from Scryfall
}
```

## Differences from ShipStation Integration

1. **No Authentication**: Scryfall API is public and doesn't require API keys
2. **Rate Limiting**: Built-in rate limiting to respect Scryfall's limits
3. **No Organization Context**: Organization ID is optional since Scryfall doesn't require auth
4. **Read-Only**: Scryfall API is primarily read-only (no POST/PUT/DELETE for most endpoints)

## Resources

- [Scryfall API Documentation](https://scryfall.com/docs/api)
- [Search Syntax Reference](https://scryfall.com/docs/syntax)
- [Card Symbols](https://scryfall.com/docs/api/card-symbols)

## License

This integration follows Scryfall's [API terms of service](https://scryfall.com/docs/api). Please be respectful of their rate limits and guidelines.