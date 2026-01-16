// src/app/serverActions/deckBuilder/deckActions.ts
'use server'

import { env } from "cloudflare:workers"
import { renderRealtimeClients } from "rwsdk/realtime/worker"
import { parseDeckList } from '@/app/lib/cardGame/deckListParser'
import { getCardsByIdentifiers } from '@/app/serverActions/cardData/cardDataActions'
import type { Deck, DeckCard } from '@/app/types/Deck'
import { migrateDeck, needsMigration, CURRENT_DECK_VERSION } from '@/app/types/Deck'
import { ScryfallCard } from "@/app/services/cardGame/CardGameState"
import { db } from '@/db' // ✅ ADDED
import { getTierConfig, getEffectiveTier } from '@/app/lib/subscriptions/tiers' // ✅ ADDED

/**
 * KV Key structure:
 * - `deck:${userId}:list` -> Array of deck IDs
 * - `deck:${userId}:${deckId}` -> Full deck object
 * 
 * Cache duration: 90 days (7,776,000 seconds)
 */

const DECK_CACHE_TTL = 60 * 60 * 24 * 90 // 90 days in seconds


/**
 * Parse deck list and fetch card data from Scryfall
 * Shared logic extracted from createDeck() - no KV storage
 * 
 * @returns Parsed deck cards with full Scryfall data
 */
export async function parseDeckAndFetchCards(deckListText: string) {
  try {
    // 1. Parse the deck list
    const parseResult = parseDeckList(deckListText)
    
    if (parseResult.errors.length > 0) {
      return {
        success: false as const,
        errors: parseResult.errors,
      }
    }

    if (parseResult.cards.length > 225) {
      return {
        success: false as const,
        errors: [`Deck too large: ${parseResult.cards.length} cards. Maximum is 225 cards.`],
      }
    }

    console.log(`[parseDeckAndFetchCards] Parsing deck with ${parseResult.cards.length} unique cards`)

    // 2. Add commander to cards list if not already present
    let cardsWithCommander = [...parseResult.cards];
    
    if (parseResult.commander) {
      const commanderInList = parseResult.cards.some(c => 
        c.name.toLowerCase() === parseResult.commander?.toLowerCase()
      );
      
      if (!commanderInList) {
        cardsWithCommander = [
          { name: parseResult.commander, quantity: 1 },
          ...parseResult.cards
        ];
        console.log(`[parseDeckAndFetchCards] Added commander "${parseResult.commander}" to card list`);
      }
    }
    
    const uniqueCardNames = [...new Set(cardsWithCommander.map(c => c.name))];
    
    if (uniqueCardNames.length === 0) {
      return {
        success: false as const,
        errors: ['No cards found in deck list'],
      };
    }
    
    const identifiers = uniqueCardNames.map(name => ({ name }));
    
    console.log(`[parseDeckAndFetchCards] Fetching ${uniqueCardNames.length} unique cards from Scryfall`);

    // 3. Fetch card data (with KV caching)
    const fetchResult = await getCardsByIdentifiers(identifiers)
    
    if (!fetchResult.success) {
      return {
        success: false as const,
        errors: ['Failed to fetch cards: ' + fetchResult.error],
      }
    }

    console.log(`[parseDeckAndFetchCards] Fetched ${fetchResult.cards.length}/${uniqueCardNames.length} cards`);

    // 4. Create lookup map
    const cardLookup = new Map(
      fetchResult.cards.map(card => [card.name.toLowerCase(), card])
    )

    // 5. Convert CardData to ScryfallCard format and expand quantities
    const scryfallCards: ScryfallCard[] = []
    
    for (const { name, quantity } of cardsWithCommander) {
      const cardData = cardLookup.get(name.toLowerCase())
      
      if (!cardData) {
        console.warn(`[parseDeckAndFetchCards] Card not found: ${name}`)
        continue
      }

      // Convert CardData (camelCase) to ScryfallCard (snake_case)
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
      }

      // Add quantity copies
      for (let i = 0; i < quantity; i++) {
        scryfallCards.push(scryfallCard)
      }
    }

    return {
      success: true as const,
      cards: scryfallCards,
      commander: parseResult.commander,      // Keep for backward compat
      commanders: parseResult.commanders,    // ADD THIS LINE
      totalCards: scryfallCards.length,
    }
  } catch (error) {
    console.error('[parseDeckAndFetchCards] Error:', error)
    return {
      success: false as const,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}


/**
 * Create a new deck from a text deck list - NOW WITH TIER LIMIT CHECKING
 * 
 * ✅ Enforces subscription tier limits (2 decks for all tiers)
 */
export async function createDeck(
  userId: string,
  deckName: string,
  deckListText: string
) {
  try {
    const startTime = Date.now()
    
    // ✅ CHECK DECK COUNT LIMIT
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { 
        stripeSubscription: true,
        squeezeSubscription: true 
      }
    })

    if (!user) {
      return {
        success: false,
        errors: ['User not found'],
      }
    }

    const tier = getEffectiveTier(user)
    const tierConfig = getTierConfig(tier)
    const maxDecks = tierConfig.features.maxDecksPerUser

    // Count existing decks
    const { decks: existingDecks } = await getUserDecks(userId)
    const currentDeckCount = existingDecks.length

    if (currentDeckCount >= maxDecks) {
      return {
        success: false,
        requiresUpgrade: true,
        currentTier: tier,
        errors: [
          `🃏 Deck limit reached! You have ${currentDeckCount}/${maxDecks} decks. ` +
          `All tiers currently support ${maxDecks} decks.`
        ],
      }
    }

    console.log(`[DeckBuilder] User ${userId} has ${currentDeckCount}/${maxDecks} decks (${tier} tier)`)
    
    // Use extracted helper
    const parseAndFetchResult = await parseDeckAndFetchCards(deckListText)
    
    if (!parseAndFetchResult.success) {
      return parseAndFetchResult // Return errors
    }
    
    const { cards: deckCards, commander, totalCards } = parseAndFetchResult

    console.log(`[DeckBuilder] Creating deck "${deckName}" with ${deckCards.length} unique cards`)

    // Get commander card for deck metadata
    const commanderCards = parseAndFetchResult.commanders?.map(cmdName => 
      deckCards.find(c => c.name.toLowerCase() === cmdName.toLowerCase())
    ).filter(Boolean) || []
    
    const commanderImageUrls = commanderCards
      .map(c => c.imageUrl)
      .filter(Boolean) as string[]
    
    // Collect all colors from commanders
    const colors = Array.from(
      new Set(commanderCards.flatMap(c => c.colors || []))
    ).sort()

    // Create V3 deck object
    const deck: Deck = {
      version: CURRENT_DECK_VERSION, // = 3
      id: `deck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: deckName,
      commanders: parseAndFetchResult.commanders || [], // Array of 1-2 commanders
      commanderImageUrls: commanderImageUrls.length > 0 ? commanderImageUrls : undefined,
      colors,
      cards: deckCards,
      totalCards,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    // Store deck in KV
    if (!env?.DECKS_KV) {
      throw new Error('DECKS_KV binding not found')
    }
    
    await env.DECKS_KV.put(
      `deck:${userId}:${deck.id}`, 
      JSON.stringify(deck), 
      {
        expirationTtl: DECK_CACHE_TTL,
        metadata: {
          userId,
          deckName: deck.name,
          commanders: deck.commanders.join(', '),  // ✅ Use commanders array
          totalCards: deck.totalCards,
          createdAt: deck.createdAt,
        }
      }
    )
    
    // Update user's deck list
    const deckListKey = `deck:${userId}:list`
    const existingListJson = await env.DECKS_KV.get(deckListKey)
    const existingList: string[] = existingListJson ? JSON.parse(existingListJson) : []
    const updatedList = [deck.id, ...existingList].slice(0, 50)
    
    await env.DECKS_KV.put(
      deckListKey, 
      JSON.stringify(updatedList),
      {
        expirationTtl: DECK_CACHE_TTL
      }
    )

    const totalTime = Date.now() - startTime
    console.log(`[DeckBuilder] ✅ Created deck "${deckName}" in ${totalTime}ms`)

    // Trigger realtime update
    if (env?.REALTIME_DURABLE_OBJECT) {
      await renderRealtimeClients({
        durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
        key: `/deck-builder/${userId}`,
      })
    }

    return {
      success: true,
      deck,
      stats: {
        totalTime,
        cardsFound: deckCards.length,
      }
    }
  } catch (error) {
    console.error('[DeckBuilder] Error creating deck:', error)
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Get all decks for a user from KV
 */
export async function getUserDecks(userId: string) {
  try {
    if (!env?.DECKS_KV) {
      throw new Error('DECKS_KV binding not found')
    }
    
    const deckListKey = `deck:${userId}:list`
    const deckListJson = await env.DECKS_KV.get(deckListKey)
    
    if (!deckListJson) {
      console.log(`[DeckBuilder] No decks found for user ${userId}`)
      return {
        success: true,
        decks: [] as Deck[],
      }
    }
    
    const deckIds: string[] = JSON.parse(deckListJson)
    console.log(`[DeckBuilder] Found ${deckIds.length} deck IDs for user ${userId}`)
    
    // Fetch all decks in parallel
    const deckPromises = deckIds.map(async (deckId) => {
      const deckJson = await env.DECKS_KV.get(`deck:${userId}:${deckId}`)
      if (!deckJson) {
        console.warn(`[DeckBuilder] Deck ${deckId} not found in KV (may have expired)`)
        return null
      }
      
      let deck: Deck = JSON.parse(deckJson)
      
      // AUTO-MIGRATE old deck versions
      if (needsMigration(deck)) {
        console.log(`[DeckBuilder] Auto-migrating deck ${deckId} to v${CURRENT_DECK_VERSION}`)
        deck = migrateDeck(deck)
        
        // Save migrated version back to KV (async, don't wait)
        env.DECKS_KV.put(
          `deck:${userId}:${deckId}`, 
          JSON.stringify(deck),
          {
            expirationTtl: DECK_CACHE_TTL,
            metadata: {
              userId,
              deckName: deck.name,
              commanders: deck.commanders.join(', '),  // ✅ Use commanders array
              totalCards: deck.totalCards,
              version: deck.version,
              migratedAt: Date.now(),
            }
          }
        ).then(() => {
          console.log(`[DeckBuilder] ✅ Migrated and saved deck ${deckId}`)
        })
      }
      
      return deck
    })
    
    const decks = (await Promise.all(deckPromises)).filter(d => d !== null) as Deck[]
    
    console.log(`[DeckBuilder] Fetched ${decks.length} decks for user ${userId}`)
    
    // Clean up missing decks from list
    if (decks.length < deckIds.length) {
      const validDeckIds = decks.map(d => d.id)
      await env.DECKS_KV.put(
        deckListKey, 
        JSON.stringify(validDeckIds),
        {
          expirationTtl: DECK_CACHE_TTL
        }
      )
      console.log(`[DeckBuilder] Cleaned up deck list, removed ${deckIds.length - decks.length} missing decks`)
    }
    
    return {
      success: true,
      decks,
    }
  } catch (error) {
    console.error('[DeckBuilder] Error fetching decks:', error)
    return {
      success: false,
      decks: [] as Deck[],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete a deck from KV
 */
export async function deleteDeck(userId: string, deckId: string) {
  try {
    if (!env?.DECKS_KV) {
      throw new Error('DECKS_KV binding not found')
    }
    
    await env.DECKS_KV.delete(`deck:${userId}:${deckId}`)
    
    const deckListKey = `deck:${userId}:list`
    const deckListJson = await env.DECKS_KV.get(deckListKey)
    
    if (deckListJson) {
      const deckIds: string[] = JSON.parse(deckListJson)
      const updatedList = deckIds.filter(id => id !== deckId)
      await env.DECKS_KV.put(
        deckListKey, 
        JSON.stringify(updatedList),
        {
          expirationTtl: DECK_CACHE_TTL
        }
      )
    }
    
    console.log(`[DeckBuilder] Deleted deck ${deckId} for user ${userId}`)

    if (env?.REALTIME_DURABLE_OBJECT) {
      await renderRealtimeClients({
        durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
        key: `/deck-builder/${userId}`,
      })
    }
    
    return {
      success: true,
    }
  } catch (error) {
    console.error('[DeckBuilder] Error deleting deck:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update a deck in KV
 */
export async function updateDeck(
  userId: string,
  deckId: string,
  updates: Partial<Deck>
) {
  try {
    if (!env?.DECKS_KV) {
      throw new Error('DECKS_KV binding not found')
    }
    
    const deckKey = `deck:${userId}:${deckId}`
    const deckJson = await env.DECKS_KV.get(deckKey)
    
    if (!deckJson) {
      return {
        success: false,
        error: 'Deck not found',
      }
    }
    
    const existingDeck: Deck = JSON.parse(deckJson)
    
    const updatedDeck: Deck = {
      ...existingDeck,
      ...updates,
      id: existingDeck.id,
      updatedAt: Date.now(),
    }
    
    await env.DECKS_KV.put(
      deckKey, 
      JSON.stringify(updatedDeck), 
      {
        expirationTtl: DECK_CACHE_TTL,
        metadata: {
          userId,
          deckName: updatedDeck.name,
          commanders: updatedDeck.commanders.join(', '),  // ✅ Use commanders array
          totalCards: updatedDeck.totalCards,
          createdAt: updatedDeck.createdAt,
          updatedAt: updatedDeck.updatedAt,
        }
      }
    )
    
    console.log(`[DeckBuilder] Updated deck ${deckId} for user ${userId}`)
    
    if (env?.REALTIME_DURABLE_OBJECT) {
      await renderRealtimeClients({
        durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
        key: `/deck-builder/${userId}`,
      })
    }
    
    return {
      success: true,
      deck: updatedDeck,
    }
  } catch (error) {
    console.error('[DeckBuilder] Error updating deck:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update deck from editor
 */
export async function updateDeckFromEditor(
  userId: string,
  deckId: string,
  deckName: string,
  cards: Array<{
    name: string,
    quantity: number,
    id?: string,
    scryfallId?: string,
    imageUrl?: string,
    type?: string,
    manaCost?: string,
    colors?: string[]
  }>
) {
  const deckCards: DeckCard[] = cards.map(card => ({
    id: card.id || card.scryfallId || card.name,
    scryfallId: card.scryfallId || '',
    name: card.name,
    quantity: card.quantity,
    imageUrl: card.imageUrl || '',
    type: card.type || '',
    manaCost: card.manaCost || '',
    colors: card.colors || []
  }))
  
  const totalCards = deckCards.reduce((sum, card) => sum + card.quantity, 0)
  
  const allColors = new Set<string>()
  deckCards.forEach(card => {
    card.colors?.forEach(color => allColors.add(color))
  })
  
  return updateDeck(userId, deckId, {
    name: deckName,
    cards: deckCards,
    totalCards,
    colors: Array.from(allColors).sort()
  })
}

/**
 * Get a single deck by ID
 */
export async function getDeck(userId: string, deckId: string) {
  try {
    if (!env?.DECKS_KV) {
      throw new Error('DECKS_KV binding not found')
    }
    
    const deckJson = await env.DECKS_KV.get(`deck:${userId}:${deckId}`)
    
    if (!deckJson) {
      return {
        success: false,
        error: 'Deck not found',
      }
    }
    
    let deck: Deck = JSON.parse(deckJson)
    
    // AUTO-MIGRATE old deck versions
    if (needsMigration(deck)) {
      console.log(`[DeckBuilder] Auto-migrating deck ${deckId} to v${CURRENT_DECK_VERSION}`)
      deck = migrateDeck(deck)
      
      // Save migrated version back to KV
      await env.DECKS_KV.put(
        `deck:${userId}:${deckId}`, 
        JSON.stringify(deck),
        {
          expirationTtl: DECK_CACHE_TTL,
          metadata: {
            userId,
            deckName: deck.name,
            commanders: deck.commanders.join(', '),  // ✅ Use commanders array
            totalCards: deck.totalCards,
            version: deck.version,
            migratedAt: Date.now(),
          }
        }
      )
      console.log(`[DeckBuilder] ✅ Migrated and saved deck ${deckId}`)
    }
    
    return {
      success: true,
      deck,
    }
  } catch (error) {
    console.error('[DeckBuilder] Error fetching deck:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}