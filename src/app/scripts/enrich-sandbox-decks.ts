// @/app/scripts/enrich-sandbox-decks.ts
import { SANDBOX_STARTER_DECKS_ARRAY } from '../../app/components/CardGame/Sandbox/sandboxStarterDecks'
import * as fs from 'fs'
import * as path from 'path'

const failedCards: Array<{deck: string, card: string, error: string}> = []
let totalFetched = 0
let totalFailed = 0

async function fetchCardFromScryfall(cardName: string, deckName: string) {
  const maxRetries = 3
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
      )
      
      if (response.status === 429) {
        console.log(`⏳ Rate limited, waiting 2s...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }
      
      if (!response.ok) {
        const error = `HTTP ${response.status}`
        failedCards.push({deck: deckName, card: cardName, error})
        totalFailed++
        return null
      }
      
      const data = await response.json()
      totalFetched++
      
      return {
        id: data.id,
        name: data.name,
        mana_cost: data.mana_cost || data.card_faces?.[0]?.mana_cost || '',
        type_line: data.type_line,
        oracle_text: data.oracle_text || data.card_faces?.map((f: any) => f.oracle_text).join(' // ') || '',
        power: data.power,
        toughness: data.toughness,
        colors: data.colors || [],
        color_identity: data.color_identity || [],
        image_uris: data.image_uris || data.card_faces?.[0]?.image_uris || {
          small: '',
          normal: '',
          large: '',
          art_crop: ''
        },
        set: data.set,
        set_name: data.set_name,
        collector_number: data.collector_number,
        rarity: data.rarity,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      
      if (attempt === maxRetries - 1) {
        failedCards.push({deck: deckName, card: cardName, error: errorMsg})
        totalFailed++
        return null
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return null
}

async function enrichDeck(deck: any) {
  const lines = deck.deckList.split('\n').filter((line: string) => line.trim())
  const cards = []
  const uniqueCards = new Set<string>()
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Handle commander line - FETCH THE COMMANDER CARD
    if (trimmed.startsWith('Commander:')) {
      const commanderName = trimmed.replace('Commander:', '').trim()
      if (!uniqueCards.has(commanderName.toLowerCase())) {
        console.log(`  Fetching commander: ${commanderName}`)
        uniqueCards.add(commanderName.toLowerCase())
        const cardData = await fetchCardFromScryfall(commanderName, deck.name)
        if (cardData) {
          cards.push(cardData)
        }
        await new Promise(resolve => setTimeout(resolve, 150))
      }
      continue
    }
    
    const match = trimmed.match(/^(\d+)\s+(.+)$/)
    if (!match) continue
    
    const [, , cardName] = match
    
    if (uniqueCards.has(cardName.toLowerCase())) continue
    uniqueCards.add(cardName.toLowerCase())
    
    const cardData = await fetchCardFromScryfall(cardName, deck.name)
    
    if (cardData) {
      cards.push(cardData)
    }
    
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  
  return {
    name: deck.name,
    commander: deck.commander,
    deckList: deck.deckList,
    cards: cards
  }
}

async function main() {
  const enrichedDecks = []
  
  for (const deck of SANDBOX_STARTER_DECKS_ARRAY) {
    console.log(`\nProcessing: ${deck.name}`)
    const enriched = await enrichDeck(deck)
    enrichedDecks.push(enriched)
    console.log(`  Fetched: ${enriched.cards.length} cards (including commander)`)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  const outputDir = path.join(process.cwd(), 'output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'enriched-decks.json'),
    JSON.stringify(enrichedDecks, null, 2)
  )
  
  const logLines = [
    `Total cards fetched: ${totalFetched}`,
    `Total cards failed: ${totalFailed}`,
    ``,
    `Failed cards by deck:`,
    ...failedCards.map(f => `[${f.deck}] ${f.card}: ${f.error}`)
  ]
  
  fs.writeFileSync(
    path.join(outputDir, 'enrichment-log.txt'),
    logLines.join('\n')
  )
  
  console.log(`\n✅ Done!`)
  console.log(`   Fetched: ${totalFetched}`)
  console.log(`   Failed: ${totalFailed}`)
  console.log(`   Output: ./output/`)
}

main().catch(console.error)