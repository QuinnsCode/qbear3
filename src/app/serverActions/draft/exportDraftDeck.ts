// app/serverActions/draft/exportDraftDeck.ts
'use server'

import { env } from 'cloudflare:workers'
import { BASIC_LANDS, type BasicLandColor, type DeckV4, DECK_LIMITS, CURRENT_DECK_VERSION } from '@/app/types/Deck'
import type { CubeCard } from '@/app/types/Draft'
import { getUserDecks } from '@/app/serverActions/deckBuilder/deckActions'
import { KVCardCache } from '@/app/services/cardData/KVCardCache'
import type { CardData } from '@/app/services/cardData/types'

const DECK_CACHE_TTL = 60 * 60 * 24 * 90 // 90 days

export async function exportDraftDeck(
  draftId: string,
  playerId: string,
  deckConfig: {
    mainDeck: Array<{ scryfallId: string; quantity: number }>
    sideboard: Array<{ scryfallId: string; quantity: number }>
    basics: Record<BasicLandColor, number>
  }
) {
  try {
    console.log('📤 Exporting draft deck:', { draftId, playerId })
    
    // 1. Check draft deck limit (10 max)
    const { decks: existingDecks } = await getUserDecks(playerId)
    const draftDeckCount = existingDecks.filter(d => d.format === 'draft').length
    
    if (draftDeckCount >= DECK_LIMITS.draft) {
      throw new Error(`You can only have ${DECK_LIMITS.draft} draft decks. Please delete an old one first.`)
    }
    
    console.log(`✅ Draft deck limit check: ${draftDeckCount}/${DECK_LIMITS.draft}`)
    
    // 2. Get DraftDO stub and fetch state
    const draftDO = env.DRAFT_DO.get(env.DRAFT_DO.idFromName(draftId))
    const draftRes = await draftDO.fetch('http://internal/state')
    
    if (!draftRes.ok) {
      throw new Error('Failed to fetch draft state')
    }
    
    const draftState = await draftRes.json()
    const cubeCards: CubeCard[] = draftState.cubeCards || []
    
    if (cubeCards.length === 0) {
      throw new Error('No cube cards found in draft state')
    }
    
    console.log('✅ Fetched draft state with', cubeCards.length, 'cube cards')
    
    // 3. Build deck cards array
    const deckCards = [
      // Main deck drafted cards
      ...deckConfig.mainDeck.map(({ scryfallId, quantity }) => {
        const card = cubeCards.find(c => c.scryfallId === scryfallId)
        if (!card) {
          console.warn(`⚠️ Card not found: ${scryfallId}`)
          return null
        }
        
        const deckCard = {
          id: scryfallId,
          scryfallId,
          name: card.name,
          quantity,
          imageUrl: card.imageUrl || '',
          type: card.types.join(' '),
          manaCost: '',
          colors: card.colors,
          isCommander: false,
          zone: 'main' as const,
          cmc: card.cmc || 0,
          rarity: card.rarity || 'common'
        }

        // Log if image URL is missing
        if (!card.imageUrl) {
          console.warn(`⚠️ Missing imageUrl for ${card.name} (${scryfallId})`)
        }

        return deckCard
      }).filter(Boolean),
      
      // Basic lands
      ...(Object.entries(deckConfig.basics) as [BasicLandColor, number][])
        .filter(([_, count]) => count > 0)
        .map(([color, count]) => ({
          id: BASIC_LANDS[color].scryfallId,
          scryfallId: BASIC_LANDS[color].scryfallId,
          name: BASIC_LANDS[color].name,
          quantity: count,
          imageUrl: BASIC_LANDS[color].imageUrl,
          type: BASIC_LANDS[color].type,
          manaCost: '',
          colors: BASIC_LANDS[color].colors,
          isCommander: false,
          zone: 'main' as const,
          cmc: 0,
          rarity: 'common'
        })),
      
      // Sideboard
      ...deckConfig.sideboard.map(({ scryfallId, quantity }) => {
        const card = cubeCards.find(c => c.scryfallId === scryfallId)
        if (!card) return null
        
        return {
          id: scryfallId,
          scryfallId,
          name: card.name,
          quantity,
          imageUrl: card.imageUrl || '',
          type: card.types.join(' '),
          manaCost: '',
          colors: card.colors,
          isCommander: false,
          zone: 'sideboard' as const,
          cmc: card.cmc || 0,
          rarity: card.rarity || 'common'
        }
      }).filter(Boolean)
    ]
    
    // 4. Cache all cards in CARDS_KV for future use
    if (env?.CARDS_KV) {
      try {
        console.log('💾 Caching draft cards to CARDS_KV...')
        const cache = new KVCardCache(env.CARDS_KV)

        // Convert deck cards to CardData format and cache them
        const cardsToCache: CardData[] = []
        const uniqueIds = new Set<string>()

        for (const deckCard of deckCards) {
          // Skip if already added (avoid duplicate caching)
          if (uniqueIds.has(deckCard.scryfallId)) continue
          uniqueIds.add(deckCard.scryfallId)

          // Find the full cube card data (or use basic land data from BASIC_LANDS constant)
          const cubeCard = cubeCards.find(c => c.scryfallId === deckCard.scryfallId)

          // For basic lands (not in cube), we already have the data from BASIC_LANDS constant
          if (!cubeCard) {
            // This is a basic land - use the deck card data directly
            const cardData: CardData = {
              id: deckCard.scryfallId,
              oracleId: deckCard.scryfallId,
              name: deckCard.name,
              manaCost: '',
              cmc: 0,
              typeLine: deckCard.type,
              oracleText: '',
              power: undefined,
              toughness: undefined,
              colors: deckCard.colors || [],
              colorIdentity: deckCard.colors || [],
              setCode: 'basic',
              setName: 'Basic Lands',
              collectorNumber: '',
              rarity: 'common',
              imageUris: deckCard.imageUrl ? {
                normal: deckCard.imageUrl,
                large: deckCard.imageUrl,
                small: deckCard.imageUrl,
                artCrop: deckCard.imageUrl
              } : undefined,
              legalities: undefined,
              provider: 'draft-basic',
              lastUpdated: Date.now()
            }
            cardsToCache.push(cardData)
            console.log(`📦 Caching basic land: ${deckCard.name}`)
            continue
          }

          // Convert to CardData format (CubeCard has limited fields)
          const cardData: CardData = {
            id: deckCard.scryfallId,
            oracleId: deckCard.scryfallId, // CubeCard doesn't have oracle_id
            name: deckCard.name,
            manaCost: '', // CubeCard doesn't have manaCost
            cmc: cubeCard.cmc || 0,
            typeLine: deckCard.type,
            oracleText: '', // CubeCard doesn't have oracle_text
            power: undefined, // CubeCard doesn't have power/toughness
            toughness: undefined,
            colors: cubeCard.colors || [],
            colorIdentity: cubeCard.colors || [], // Use colors as color_identity
            setCode: 'cube', // Mark as from cube
            setName: 'Vintage Cube',
            collectorNumber: '',
            rarity: (cubeCard.rarity as any) || 'common',
            imageUris: cubeCard.imageUrl ? {
              normal: cubeCard.imageUrl,
              large: cubeCard.imageUrl,
              small: cubeCard.imageUrl,
              artCrop: cubeCard.imageUrl
            } : undefined,
            legalities: undefined, // CubeCard doesn't have legalities
            provider: 'draft-cube',
            lastUpdated: Date.now()
          }

          cardsToCache.push(cardData)
        }

        // Cache all unique cards in parallel
        if (cardsToCache.length > 0) {
          await cache.setCards(cardsToCache)
          console.log(`✅ Cached ${cardsToCache.length} unique cards to CARDS_KV`)
        }
      } catch (cacheError) {
        // Don't fail the export if caching fails
        console.error('⚠️ Failed to cache cards (non-fatal):', cacheError)
      }
    }

    // 5. Calculate deck stats
    const allColors = new Set<string>()
    deckCards.forEach(card => card.colors?.forEach(c => allColors.add(c)))

    const totalCards = deckCards.reduce((sum, card) => sum + card.quantity, 0)

    if (totalCards < 40) {
      throw new Error(`Deck must have at least 40 cards (has ${totalCards})`)
    }
    
    // 6. Create deck object
    const player = draftState.players?.find((p: any) => p.id === playerId)
    const deckId = `deck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const draftDeck: DeckV4 = {
      version: CURRENT_DECK_VERSION,
      id: deckId,
      format: 'draft',
      name: `Draft - ${new Date().toLocaleDateString()}`,
      colors: Array.from(allColors).sort() as ('W' | 'U' | 'B' | 'R' | 'G')[],
      cards: deckCards as any,
      totalCards,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      draftMetadata: {
        draftId,
        draftDate: Date.now(),
        cubeId: draftState.cubeId,
        pickHistory: player?.draftPool || []
      }
    }
    
    console.log('✅ Created deck:', deckId)

    // 7. Save to KV
    if (!env?.DECKS_KV) {
      throw new Error('DECKS_KV binding not found')
    }
    
    await env.DECKS_KV.put(
      `deck:${playerId}:${deckId}`,
      JSON.stringify(draftDeck),
      {
        expirationTtl: DECK_CACHE_TTL,
        metadata: {
          userId: playerId,
          deckName: draftDeck.name,
          format: 'draft',
          totalCards: draftDeck.totalCards,
          createdAt: draftDeck.createdAt
        }
      }
    )
    
    // 8. Update user's deck list
    const deckListKey = `deck:${playerId}:list`
    const existingListJson = await env.DECKS_KV.get(deckListKey)
    const existingList: string[] = existingListJson ? JSON.parse(existingListJson) : []
    const updatedList = [deckId, ...existingList]
    
    await env.DECKS_KV.put(
      deckListKey,
      JSON.stringify(updatedList),
      { expirationTtl: DECK_CACHE_TTL }
    )
    
    console.log('✅ Saved deck to KV')

    // 9. Update draft DO with finalization
    await draftDO.fetch('http://internal/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'finalize_deck',
        playerId,
        data: {
          deckConfig,
          exportedDeckId: deckId
        }
      })
    })
    
    console.log('✅ Updated draft DO')
    
    return {
      success: true,
      deckId,
      deckName: draftDeck.name,
      totalCards: draftDeck.totalCards
    }
    
  } catch (error) {
    console.error('❌ Export failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export deck'
    }
  }
}