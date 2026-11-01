// src/app/services/cardData/CardDataService.ts
import type { ICardProvider } from './ICardProvider'
import { chunk, KVCardCache, normalizeCardName } from './KVCardCache'
import type { CardData, CardIdentifier } from './types'

/** Runs work after the reply is sent (ctx.waitUntil); awaiting it is the fallback. */
export type Defer = (work: Promise<unknown>) => void

/**
 * Cache-first card lookups: KV for cards anyone has asked for, the provider for the rest.
 *
 *   new CardDataService(new ScryfallProvider(), new KVCardCache(env.CARDS_KV), waitUntil)
 *
 * Cache writes go through `defer`, so a deck import replies as soon as Scryfall answers.
 */
export class CardDataService {
  constructor(
    private provider: ICardProvider,
    private cache: KVCardCache,
    private defer?: Defer,
  ) {}

  private async store(entries: Array<{ card: CardData; names?: string[] }>, notFound: string[] = []): Promise<void> {
    if (entries.length === 0 && notFound.length === 0) return
    const work = Promise.all([
      entries.length > 0 ? this.cache.putCards(entries) : undefined,
      notFound.length > 0 ? this.cache.putMissingNames(notFound) : undefined,
    ])
    if (this.defer) this.defer(work)
    else await work
  }

  async getCard(id: string): Promise<CardData> {
    const cached = await this.cache.getCard(id)
    if (cached) return cached
    const card = await this.provider.getCard(id)
    await this.store([{ card }])
    return card
  }

  /** Fuzzy lookup by name. Set-filtered lookups skip the cache, whose name keys have no set. */
  async getCardByName(name: string, setCode?: string): Promise<CardData> {
    if (!setCode) {
      const cached = await this.cache.getCardByName(name)
      if (cached) return cached
    }
    const card = await this.provider.getCardByName(name, setCode)
    if (!setCode) await this.store([{ card, names: [name] }])
    return card
  }

  /**
   * Many cards at once (deck imports). Cached ones come from two bulk KV reads; the rest from as
   * few provider calls as its batch limit allows, one after another so the rate limit holds.
   * A batch that fails leaves its cards out (the caller reports them missing) unless every
   * batch fails and nothing was cached, which throws. `fresh` skips the cache read (admin seeding).
   */
  async getCardsByIdentifiers(identifiers: CardIdentifier[], { fresh = false } = {}): Promise<CardData[]> {
    const byId = fresh ? [] : identifiers.flatMap(i => i.id ? [i.id] : [])
    const byName = fresh ? [] : identifiers.flatMap(i => cachedByName(i) ?? [])
    const [cachedById, namedHits] = await Promise.all([
      this.cache.getCards(byId),
      this.cache.getCardsByName(byName),
    ])

    const found = new Map<string, CardData>()
    const missing: CardIdentifier[] = []
    const asked = new Set<string>()
    for (const identifier of identifiers) {
      const key = identifierKey(identifier)
      if (asked.has(key)) continue
      asked.add(key)
      const name = cachedByName(identifier)
      const hit = identifier.id
        ? cachedById.get(identifier.id)
        : name ? namedHits.get(normalizeCardName(name)) : undefined
      if (hit) found.set(hit.id, hit)
      else missing.push(identifier)
    }

    // Names Scryfall already failed to find today are not asked about again. Only names that
    // missed the cache are looked up, so an import that is all cache hits costs no extra read.
    if (!fresh && missing.length > 0) {
      const knownMissing = await this.cache.getMissingNames(missing.flatMap(i => cachedByName(i) ?? []))
      for (let i = missing.length - 1; i >= 0; i--) {
        const name = cachedByName(missing[i]!)
        if (name && knownMissing.has(normalizeCardName(name))) missing.splice(i, 1)
      }
    }

    if (missing.length === 0) return [...found.values()]
    console.log(`[CardData] ${found.size} cached, fetching ${missing.length} from ${this.provider.name}`)

    const toStore: Array<{ card: CardData; names: string[] }> = []
    const notFound: string[] = []
    let failures = 0
    const batches = chunk(missing, this.provider.maxBatch)
    for (const batch of batches) {
      let fetched: CardData[]
      try {
        fetched = await this.provider.getCardsByIdentifiers(batch)
      } catch (error) {
        failures++
        console.error(`[CardData] batch of ${batch.length} failed`, error)
        continue
      }
      // Only a batch that answered can say a name doesn't exist (a failed one says nothing).
      for (const i of batch) {
        const name = cachedByName(i)
        if (name && !fetched.some(card => answersName(card, name))) notFound.push(name)
      }
      for (const card of fetched) {
        found.set(card.id, card)
        // Remember the name it was asked for too (the cache adds the card's own and front-face names).
        const names = batch.flatMap(i => !i.id && i.name && answersName(card, i.name) ? [i.name] : [])
        toStore.push({ card, names })
      }
    }
    if (failures === batches.length && found.size === 0) {
      throw new Error(`${this.provider.name} is not answering; try again in a moment`)
    }

    await this.store(toStore, notFound)
    return [...found.values()]
  }

  async getAllPrintings(oracleId: string): Promise<CardData[]> {
    return this.provider.getAllPrintings(oracleId)
  }
}

/** The name to look up in the cache: plain name lookups only (name keys carry no set). */
function cachedByName(identifier: CardIdentifier): string | undefined {
  return !identifier.id && !identifier.setCode && !identifier.collectorNumber ? identifier.name : undefined
}

function identifierKey(identifier: CardIdentifier): string {
  if (identifier.id) return `id:${identifier.id}`
  return `name:${normalizeCardName(identifier.name ?? '')}:${identifier.setCode ?? ''}:${identifier.collectorNumber ?? ''}`
}

/** The names a card answers to: its full name, and each face of a double-faced or split card. */
export function cardNames(card: Pick<CardData, 'name'>): string[] {
  const faces = card.name.split(' // ')
  return faces.length > 1 ? [card.name, ...faces] : [card.name]
}

export function answersName(card: CardData, name: string): boolean {
  const wanted = normalizeCardName(name)
  return cardNames(card).some(n => normalizeCardName(n) === wanted)
}
