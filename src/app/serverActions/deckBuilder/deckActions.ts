// src/app/serverActions/deckBuilder/deckActions.ts
'use server'

import { env } from "cloudflare:workers"
import { parseDeckList } from '@/app/lib/cardGame/deckListParser'
import { getCardsByIdentifiers } from '@/app/serverActions/cardData/cardDataActions'
import type { Deck, DeckCard } from '@/app/types/Deck'
import { migrateDeck, needsMigration, normalizeDeck, CURRENT_DECK_VERSION } from '@/app/types/Deck'
import { ScryfallCard } from "@/app/services/cardGame/CardGameState"
import { db, setupDb } from '@/db' // ✅ Import setupDb
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

    // 4. Retry failed cards (if any missing)
    let allCards = fetchResult.cards
    const initialMissing = uniqueCardNames.filter(name =>
      !fetchResult.cards.some(card => card.name.toLowerCase() === name.toLowerCase())
    )

    if (initialMissing.length > 0 && initialMissing.length < 10) {
      console.log(`[parseDeckAndFetchCards] Retrying ${initialMissing.length} missing cards...`)
      const retryIdentifiers = initialMissing.map(name => ({ name }))
      const retryResult = await getCardsByIdentifiers(retryIdentifiers)

      if (retryResult.success && retryResult.cards.length > 0) {
        console.log(`[parseDeckAndFetchCards] Retry recovered ${retryResult.cards.length} cards`)
        allCards = [...allCards, ...retryResult.cards]
      }
    }

    // 5. Track missing and incomplete cards
    const missingCards: string[] = []
    const incompleteCards: { name: string; missingFields: string[] }[] = []

    // 6. Create lookup map from all fetched cards (initial + retry)
    const cardLookup = new Map(
      allCards.map(card => [card.name.toLowerCase(), card])
    )

    // 6. Convert CardData to ScryfallCard format with quantities
    const scryfallCards: ScryfallCard[] = []

    for (const { name, quantity } of cardsWithCommander) {
      const cardData = cardLookup.get(name.toLowerCase())

      if (!cardData) {
        console.warn(`[parseDeckAndFetchCards] Card not found: ${name}`)
        missingCards.push(name)
        continue
      }

      // Validate required fields are present
      const missingFields: string[] = []
      if (!cardData.id) missingFields.push('id')
      if (!cardData.name) missingFields.push('name')
      if (!cardData.typeLine) missingFields.push('typeLine')
      if (!cardData.imageUris?.normal && !cardData.imageUris?.large) missingFields.push('imageUrl')

      if (missingFields.length > 0) {
        console.warn(`[parseDeckAndFetchCards] Incomplete card data for ${name}:`, missingFields)
        incompleteCards.push({ name, missingFields })
      }

      // Convert CardData (camelCase) to ScryfallCard (snake_case)
      // IMPORTANT: Also add flat fields for deck builder compatibility
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

        // Add flat fields for deck builder (DeckCard type compatibility)
        imageUrl: imageUrl,
        type: cardData.typeLine,  // Deck builder categorization needs 'type' field
        manaCost: cardData.manaCost,
        cmc: cardData.cmc,
        quantity: quantity,  // ✅ Store quantity instead of expanding
      }

      // ✅ CHANGED: Store one card with quantity instead of expanding
      scryfallCards.push(scryfallCard)
    }

    // Return success with warnings if some cards are missing/incomplete
    const hasIssues = missingCards.length > 0 || incompleteCards.length > 0

    return {
      success: true as const,
      cards: scryfallCards,
      commander: parseResult.commander,
      commanders: parseResult.commanders,
      totalCards: scryfallCards.reduce((sum, card) => sum + (card.quantity || 1), 0),
      // Validation results
      missingCards: missingCards.length > 0 ? missingCards : undefined,
      incompleteCards: incompleteCards.length > 0 ? incompleteCards : undefined,
      warnings: hasIssues ? [
        ...(missingCards.length > 0 ? [`${missingCards.length} cards not found: ${missingCards.join(', ')}`] : []),
        ...(incompleteCards.length > 0 ? [`${incompleteCards.length} cards have incomplete data`] : [])
      ] : undefined
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

    // Initialize database connection
    await setupDb(env)

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
    const tierConfig = getTierConfig(tier, user.email)  // ✅ Pass user.email for override

    // Count existing decks by format
    const { decks: existingDecks } = await getUserDecks(userId)
    const commanderDecks = existingDecks.filter(d => d.format === 'commander')
    const draftDecks = existingDecks.filter(d => d.format === 'draft')

    // This will create a commander deck (default format)
    const deckFormat = 'commander'
    const maxCommanderDecks = tierConfig.features.maxCommanderDecks
    const maxDraftDecks = tierConfig.features.maxDraftDecks

    if (commanderDecks.length >= maxCommanderDecks) {
      return {
        success: false,
        requiresUpgrade: true,
        currentTier: tier,
        errors: [
          `🃏 Commander deck limit reached! You have ${commanderDecks.length}/${maxCommanderDecks} commander decks. ` +
          `You can still create ${maxDraftDecks - draftDecks.length} draft decks.`
        ],
      }
    }

    console.log(`[DeckBuilder] User ${userId} has ${commanderDecks.length}/${maxCommanderDecks} commander decks, ${draftDecks.length}/${maxDraftDecks} draft decks (${tier} tier)`)
    
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

    // Create V4 deck object
    const deck: Deck = {
      version: CURRENT_DECK_VERSION, // = 4
      id: `deck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: deckName,
      format: 'commander',  // ✅ REQUIRED for DeckV4
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
    // await syncDeckBuilder(userId);

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
 * Normalize deck for duplicate comparison
 * - Removes basic lands
 * - Sorts cards alphabetically
 * - Returns sorted string for comparison
 */
function normalizeDeckForComparison(cards: { name: string; quantity: number }[]): string {
  const BASIC_LANDS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']

  // Filter out basic lands and sort
  const nonBasics = cards
    .filter(card => !BASIC_LANDS.includes(card.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(card => `${card.quantity}x ${card.name}`)

  return nonBasics.join('|')
}

/**
 * Fetch draft deck from KV by draft ID
 */
async function fetchDraftDeckFromKV(draftId: string): Promise<{ success: boolean; deckList?: string; error?: string }> {
  try {
    const key = `draft:${draftId}:deck`
    const deckData = await env.DECKS_KV.get(key)

    if (!deckData) {
      return {
        success: false,
        error: 'Draft not found in storage. It may have expired or the ID is incorrect.'
      }
    }

    return {
      success: true,
      deckList: deckData
    }
  } catch (error) {
    console.error('[DeckBuilder] Error fetching draft from KV:', error)
    return {
      success: false,
      error: 'Failed to fetch draft from storage'
    }
  }
}

/**
 * Parse draft export text to extract draft ID and decklist
 */
function parseDraftExport(text: string): { draftId?: string; deckList: string } {
  const lines = text.split('\n')
  let draftId: string | undefined
  const deckListLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Extract draft ID from header
    if (trimmed.startsWith('# Draft ID:')) {
      draftId = trimmed.replace('# Draft ID:', '').trim()
      continue
    }

    // Skip other comment lines
    if (trimmed.startsWith('#')) {
      continue
    }

    // Add card lines
    if (trimmed) {
      deckListLines.push(trimmed)
    }
  }

  return {
    draftId,
    deckList: deckListLines.join('\n')
  }
}

/**
 * Create a draft deck (from draft/limited play)
 * Supports two modes:
 * 1. Draft ID only (fetches from KV)
 * 2. Full text export (parses text, extracts draft ID)
 */
export async function createDraftDeck(
  userId: string,
  deckName: string,
  deckListText: string,
  draftId?: string
) {
  try {
    const startTime = Date.now()

    // Initialize database connection
    await setupDb(env)

    // Check deck count limit
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
    const tierConfig = getTierConfig(tier, user.email)

    // Count existing decks by format
    const { decks: existingDecks } = await getUserDecks(userId)
    const draftDecks = existingDecks.filter(d => d.format === 'draft')
    const maxDraftDecks = tierConfig.features.maxDraftDecks

    if (draftDecks.length >= maxDraftDecks) {
      return {
        success: false,
        requiresUpgrade: true,
        currentTier: tier,
        errors: [
          `📥 Draft deck limit reached! You have ${draftDecks.length}/${maxDraftDecks} draft decks.`
        ],
      }
    }

    console.log(`[DeckBuilder] Creating draft deck for user ${userId} (${draftDecks.length}/${maxDraftDecks})`)

    let finalDeckList = deckListText
    let finalDraftId = draftId

    // MODE 1: Draft ID provided (try KV first)
    if (draftId && !deckListText.trim()) {
      console.log(`[DeckBuilder] Fetching draft from KV: ${draftId}`)
      const kvResult = await fetchDraftDeckFromKV(draftId)

      if (!kvResult.success) {
        return {
          success: false,
          errors: [kvResult.error || 'Failed to fetch draft from storage']
        }
      }

      finalDeckList = kvResult.deckList!
    }
    // MODE 2: Text provided (parse it, extract draft ID if present)
    else if (deckListText.trim()) {
      console.log(`[DeckBuilder] Parsing draft export text`)
      const parsed = parseDraftExport(deckListText)
      finalDeckList = parsed.deckList
      if (parsed.draftId && !finalDraftId) {
        finalDraftId = parsed.draftId
        console.log(`[DeckBuilder] Extracted draft ID from text: ${finalDraftId}`)
      }
    }

    if (!finalDeckList.trim()) {
      return {
        success: false,
        errors: ['No deck list provided']
      }
    }

    // Parse deck list (no commander needed for draft)
    const parseResult = parseDeckList(finalDeckList)

    if (parseResult.errors.length > 0) {
      return {
        success: false,
        errors: parseResult.errors,
      }
    }

    if (parseResult.cards.length > 225) {
      return {
        success: false,
        errors: [`Deck too large: ${parseResult.cards.length} cards. Maximum is 225 cards.`],
      }
    }

    // Fetch card data
    const uniqueCardNames = [...new Set(parseResult.cards.map(c => c.name))]
    const identifiers = uniqueCardNames.map(name => ({ name }))

    const fetchResult = await getCardsByIdentifiers(identifiers)

    if (!fetchResult.success) {
      return {
        success: false,
        errors: ['Failed to fetch cards: ' + fetchResult.error],
      }
    }

    // Create lookup map
    const cardLookup = new Map(
      fetchResult.cards.map(card => [card.name.toLowerCase(), card])
    )

    // Convert to DeckCard format
    const deckCards: DeckCard[] = []
    const missingCards: string[] = []

    for (const card of parseResult.cards) {
      const fetchedCard = cardLookup.get(card.name.toLowerCase())

      if (!fetchedCard) {
        missingCards.push(card.name)
        continue
      }

      deckCards.push({
        id: fetchedCard.id,
        scryfallId: fetchedCard.id,
        name: fetchedCard.name,
        quantity: card.quantity,
        imageUrl: fetchedCard.image_uris?.normal || fetchedCard.image_uris?.large || '',
        type: fetchedCard.type_line || '',
        manaCost: fetchedCard.mana_cost || '',
        colors: fetchedCard.colors || [],
        isCommander: false, // Draft decks don't have commanders
        zone: 'main',
        cmc: fetchedCard.cmc,
        rarity: fetchedCard.rarity,
        oracle_text: fetchedCard.oracle_text,
      })
    }

    // Calculate total cards
    const totalCards = deckCards.reduce((sum, card) => sum + card.quantity, 0)

    // Validate minimum cards for draft
    if (totalCards < 40) {
      return {
        success: false,
        errors: [`Draft deck must have at least 40 cards. You have ${totalCards} cards.`],
      }
    }

    // ✅ CHECK FOR DUPLICATE DECKS (smart comparison)
    const newDeckNormalized = normalizeDeckForComparison(
      deckCards.map(c => ({ name: c.name, quantity: c.quantity }))
    )

    for (const existingDeck of draftDecks) {
      const existingNormalized = normalizeDeckForComparison(
        existingDeck.cards.map(c => ({ name: c.name, quantity: c.quantity }))
      )

      if (newDeckNormalized === existingNormalized) {
        return {
          success: false,
          errors: [
            `⚠️ Duplicate deck detected!`,
            `You already have an identical deck: "${existingDeck.name}"`,
            `(Ignoring basic lands, ${existingDeck.cards.filter(c => !['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'].includes(c.name)).length} non-basic cards match)`,
            ``,
            `This check ignores basic lands you may have added.`,
            `If you want to import anyway, delete the existing deck first.`
          ]
        }
      }
    }

    // Detect colors from cards
    const allColors = new Set<string>()
    deckCards.forEach(card => {
      card.colors?.forEach(color => allColors.add(color))
    })

    // Create deck object
    const deckId = crypto.randomUUID()
    const deck: Deck = {
      version: CURRENT_DECK_VERSION,
      id: deckId,
      name: deckName,
      format: 'draft',
      commanders: [],
      colors: Array.from(allColors),
      cards: deckCards,
      totalCards,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      draftMetadata: {
        draftId: finalDraftId || `draft-${Date.now()}`,
        draftDate: Date.now(),
        importedFromDraft: true, // ✅ Track that this was imported (not live draft)
      }
    }

    // Store in KV
    await env.DECKS_KV.put(
      `deck:${userId}:${deckId}`,
      JSON.stringify(deck),
      {
        expirationTtl: DECK_CACHE_TTL,
        metadata: {
          deckName: deck.name,
          format: deck.format,
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
    console.log(`[DeckBuilder] ✅ Created draft deck "${deckName}" in ${totalTime}ms`)

    const warnings = missingCards.length > 0
      ? [`Warning: ${missingCards.length} cards not found on Scryfall: ${missingCards.slice(0, 5).join(', ')}${missingCards.length > 5 ? '...' : ''}`]
      : undefined

    return {
      success: true,
      deck,
      warnings,
      stats: {
        totalTime,
        cardsFound: deckCards.length,
        cardsMissing: missingCards.length,
      }
    }
  } catch (error) {
    console.error('[DeckBuilder] Error creating draft deck:', error)
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
      const kvResult = await env.DECKS_KV.getWithMetadata(`deck:${userId}:${deckId}`)
      if (!kvResult.value) {
        console.warn(`[DeckBuilder] Deck ${deckId} not found in KV (may have expired)`)
        return null
      }

      let deck: Deck = JSON.parse(kvResult.value)
      const metadata = kvResult.metadata as any
      let needsUpdate = false

      // AUTO-MIGRATE old deck versions
      if (needsMigration(deck)) {
        console.log(`[DeckBuilder] Auto-migrating deck ${deckId} to v${CURRENT_DECK_VERSION}`)
        deck = migrateDeck(deck)
        needsUpdate = true
      }

      // NORMALIZE: Only if deck has never been normalized OR needs migration
      // Check if normalized: must have normalizedAt timestamp in metadata AND correct version
      const isNormalized = metadata?.normalizedAt && metadata?.version === CURRENT_DECK_VERSION

      if (!isNormalized) {
        console.log(`[DeckBuilder] Normalizing deck ${deckId} (first time or after migration)`)
        const originalTotalCards = deck.totalCards
        deck = normalizeDeck(deck)

        // Check if normalization actually changed anything
        if (deck.totalCards !== originalTotalCards || needsUpdate) {
          needsUpdate = true
        }
      }

      // Only save back to KV if deck was actually modified
      if (needsUpdate) {
        env.DECKS_KV.put(
          `deck:${userId}:${deckId}`,
          JSON.stringify(deck),
          {
            expirationTtl: DECK_CACHE_TTL,
            metadata: {
              userId,
              deckName: deck.name,
              commanders: deck.commanders?.join(', ') || 'Unknown',
              totalCards: deck.totalCards,
              version: deck.version,
              normalizedAt: Date.now(),
            }
          }
        ).then(() => {
          console.log(`[DeckBuilder] ✅ Updated and saved deck ${deckId}`)
        }).catch(err => {
          console.error(`[DeckBuilder] Failed to save updated deck ${deckId}:`, err)
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

    // await syncDeckBuilder(userId);
    
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
      // Preserve essential fields that shouldn't be changed
      id: existingDeck.id,
      version: existingDeck.version || CURRENT_DECK_VERSION,
      format: existingDeck.format || 'commander',  // Preserve format
      createdAt: existingDeck.createdAt,
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
          commanders: updatedDeck.commanders?.join(', ') || 'Unknown',  // ✅ Handle undefined
          totalCards: updatedDeck.totalCards,
          createdAt: updatedDeck.createdAt,
          updatedAt: updatedDeck.updatedAt,
        }
      }
    )
    
    console.log(`[DeckBuilder] Updated deck ${deckId} for user ${userId}`)
    
    // await syncDeckBuilder(userId);
    
    return {
      success: true,
      deck: updatedDeck,
    }
  } catch (error) {
    console.error('[DeckBuilder] Error updating deck:', error)
    console.error('[DeckBuilder] Error details:', {
      userId,
      deckId,
      updateKeys: Object.keys(updates),
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    })
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
  cards: DeckCard[]
) {
  // Validate card data before saving
  const incompleteCards: { name: string; missingFields: string[] }[] = []

  const deckCards = cards.map(card => {
    const missingFields: string[] = []
    if (!card.id && !card.scryfallId) missingFields.push('id')
    if (!card.name) missingFields.push('name')
    if (!card.imageUrl) missingFields.push('imageUrl')
    if (!card.type) missingFields.push('type')

    if (missingFields.length > 0) {
      incompleteCards.push({ name: card.name || 'Unknown', missingFields })
    }

    return {
      ...card,
      scryfallId: card.scryfallId || card.id || '',
      id: card.id || card.scryfallId || '',
      imageUrl: card.imageUrl || '',
      type: card.type || '',
      manaCost: card.manaCost || '',
      colors: card.colors || []
    }
  })

  // If there are incomplete cards, return error with details
  if (incompleteCards.length > 0) {
    console.error('[updateDeckFromEditor] Incomplete card data:', incompleteCards)
    return {
      success: false,
      error: `${incompleteCards.length} cards have incomplete data. Use "Refresh Card Data" to fix.`,
      incompleteCards
    }
  }

  const totalCards = deckCards.reduce((sum, card) => sum + card.quantity, 0)

  const allColors = new Set<string>()
  deckCards.forEach(card => {
    card.colors?.forEach(color => allColors.add(color))
  })

  // Extract commanders from cards with zone='commander' or isCommander=true
  const commanderCards = deckCards.filter(card =>
    card.zone === 'commander' || card.isCommander === true
  )
  const commanders = commanderCards.map(card => card.name)
  const commanderImageUrls = commanderCards.map(card => card.imageUrl || '')

  return updateDeck(userId, deckId, {
    name: deckName,
    cards: deckCards,
    totalCards,
    colors: Array.from(allColors).sort(),
    commanders: commanders.length > 0 ? commanders : undefined,
    commanderImageUrls: commanderImageUrls.length > 0 ? commanderImageUrls : undefined
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
    
    const kvResult = await env.DECKS_KV.getWithMetadata(`deck:${userId}:${deckId}`)

    if (!kvResult.value) {
      return {
        success: false,
        error: 'Deck not found',
      }
    }

    let deck: Deck = JSON.parse(kvResult.value)
    const metadata = kvResult.metadata as any
    let needsUpdate = false

    // AUTO-MIGRATE old deck versions
    if (needsMigration(deck)) {
      console.log(`[DeckBuilder] Auto-migrating deck ${deckId} to v${CURRENT_DECK_VERSION}`)
      deck = migrateDeck(deck)
      needsUpdate = true
    }

    // NORMALIZE: Only if deck has never been normalized OR needs migration
    const isNormalized = metadata?.normalizedAt && metadata?.version === CURRENT_DECK_VERSION

    if (!isNormalized) {
      console.log(`[DeckBuilder] Normalizing deck ${deckId} (first time or after migration)`)
      const originalTotalCards = deck.totalCards
      deck = normalizeDeck(deck)

      if (deck.totalCards !== originalTotalCards || needsUpdate) {
        needsUpdate = true
      }
    }

    // Only save back to KV if deck was actually modified
    if (needsUpdate) {
      await env.DECKS_KV.put(
        `deck:${userId}:${deckId}`,
        JSON.stringify(deck),
        {
          expirationTtl: DECK_CACHE_TTL,
          metadata: {
            userId,
            deckName: deck.name,
            commanders: deck.commanders?.join(', ') || 'Unknown',
            totalCards: deck.totalCards,
            version: deck.version,
            normalizedAt: Date.now(),
          }
        }
      )
      console.log(`[DeckBuilder] ✅ Updated and saved deck ${deckId}`)
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