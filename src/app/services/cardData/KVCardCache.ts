// src/app/services/cardData/KVCardCache.ts
import type { CardData } from './types'

/**
 * Card records in Workers KV, shared by every colo.
 *
 * Keys:
 * - card:id:{printId}  → CardData JSON. Metadata { name, image } so admin listings need no reads.
 * - card:name:{name}   → printId, for each name a card was asked for by (its own name, and a
 *                        double-faced card's front face, which is what deck lists usually say).
 * - card:missing:{name} → "1", for a name the provider said it has no card for. Expires in a day
 *                        (KV's own TTL), so a card printed later is found again within 24 hours.
 *
 * KV bills every write ($5/M, 1k/day free) and every read ($0.50/M), so reads go out in bulk
 * (one call per 100 keys) and nothing is written twice in one batch. Search and autocomplete are
 * not here: Scryfall's GET replies sit in the free Cache API (src/app/api/scryfall/scryfall.ts).
 */

const ID_PREFIX = 'card:id:'
const NAME_PREFIX = 'card:name:'
const MISSING_PREFIX = 'card:missing:'
const MISSING_TTL_SECONDS = 24 * 60 * 60
const TTL_SECONDS = 365 * 24 * 60 * 60 // printings don't change; prices in here can be a year old
const BULK_GET_MAX = 100 // KV's limit on keys in one get

/** What sits on each card:id: key, readable from list() without fetching the value. */
export interface CardKeyMetadata {
  name: string
  image?: string
}

export function cardKeyMetadata(value: unknown): CardKeyMetadata | null {
  if (!value || typeof value !== 'object' || !('name' in value) || typeof value.name !== 'string') return null
  const image = 'image' in value && typeof value.image === 'string' ? value.image : undefined
  return { name: value.name, image }
}

/** Lowercase, trimmed, spaces to underscores: the form card:name: keys have always used. */
export function normalizeCardName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '_')
}

export function cardImageUrl(card: CardData): string | undefined {
  return card.imageUris?.normal || card.imageUris?.large || card.imageUris?.small
}

function isCardData(value: unknown): value is CardData {
  return !!value && typeof value === 'object'
    && 'id' in value && typeof value.id === 'string'
    && 'name' in value && typeof value.name === 'string'
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** The slice of KVNamespace this cache uses (a KVNamespace is one). */
export interface CardStore {
  get(keys: string[], type: 'text'): Promise<Map<string, string | null>>
  put(key: string, value: string, options: { expirationTtl: number; metadata?: CardKeyMetadata }): Promise<void>
  delete(key: string): Promise<void>
}

export class KVCardCache {
  constructor(private kv: CardStore) {}

  /** Raw values for many keys, at most 100 per KV call, all calls in flight together. */
  private async getMany(keys: string[]): Promise<Map<string, string>> {
    const found = new Map<string, string>()
    const unique = [...new Set(keys)]
    const pages = await Promise.all(chunk(unique, BULK_GET_MAX).map(page => this.kv.get(page, 'text')))
    for (const page of pages) {
      for (const [key, value] of page) if (value !== null) found.set(key, value)
    }
    return found
  }

  /** Cards by print id. Ids not cached (or not parseable) are absent from the map. */
  async getCards(ids: string[]): Promise<Map<string, CardData>> {
    const raw = await this.getMany(ids.map(id => ID_PREFIX + id))
    const cards = new Map<string, CardData>()
    for (const [key, text] of raw) {
      try {
        const value: unknown = JSON.parse(text)
        // Draft exports used to store stripped cube cards (no rules text) under real ids;
        // read those as misses so the next fetch replaces them.
        if (isCardData(value) && !value.provider?.startsWith('draft-')) cards.set(key.slice(ID_PREFIX.length), value)
      } catch {
        console.warn(`[KVCardCache] unreadable entry ${key}`)
      }
    }
    return cards
  }

  /** Cards by the names they were asked for, keyed by normalizeCardName(name). Two bulk reads. */
  async getCardsByName(names: string[]): Promise<Map<string, CardData>> {
    const normalized = names.map(normalizeCardName)
    const ids = await this.getMany(normalized.map(n => NAME_PREFIX + n))
    const cards = await this.getCards([...ids.values()])
    const byName = new Map<string, CardData>()
    for (const name of normalized) {
      const id = ids.get(NAME_PREFIX + name)
      const card = id ? cards.get(id) : undefined
      if (card) byName.set(name, card)
    }
    return byName
  }

  /** Which of these names the provider already failed to find today, as normalizeCardName forms. */
  async getMissingNames(names: string[]): Promise<Set<string>> {
    const normalized = names.map(normalizeCardName)
    const found = await this.getMany(normalized.map(n => MISSING_PREFIX + n))
    return new Set(normalized.filter(n => found.has(MISSING_PREFIX + n)))
  }

  /** Remember names the provider has no card for, so the next import skips them. */
  async putMissingNames(names: string[]): Promise<void> {
    const unique = [...new Set(names.map(normalizeCardName))]
    const results = await Promise.allSettled(unique.map(name =>
      this.kv.put(MISSING_PREFIX + name, '1', { expirationTtl: MISSING_TTL_SECONDS })))
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) console.warn(`[KVCardCache] ${failed}/${results.length} missing-name writes failed`)
  }

  async getCard(id: string): Promise<CardData | null> {
    return (await this.getCards([id])).get(id) ?? null
  }

  async getCardByName(name: string): Promise<CardData | null> {
    return (await this.getCardsByName([name])).get(normalizeCardName(name)) ?? null
  }

  /**
   * Store cards and the names they were asked for. Each card gets its id key plus one name key
   * per distinct name (its own and its front face's always included); duplicates are written once,
   * since KV rejects a second write to one key within a second.
   */
  async putCards(entries: Array<{ card: CardData; names?: string[] }>): Promise<void> {
    const writes = new Map<string, () => Promise<void>>()
    for (const { card, names = [] } of entries) {
      const metadata: CardKeyMetadata = { name: card.name, image: cardImageUrl(card) }
      writes.set(ID_PREFIX + card.id, () =>
        this.kv.put(ID_PREFIX + card.id, JSON.stringify(card), { expirationTtl: TTL_SECONDS, metadata }))
      const frontFace = card.name.split(' // ')[0]!
      for (const name of new Set([card.name, frontFace, ...names].map(normalizeCardName))) {
        writes.set(NAME_PREFIX + name, () =>
          this.kv.put(NAME_PREFIX + name, card.id, { expirationTtl: TTL_SECONDS }))
      }
    }
    const results = await Promise.allSettled([...writes.values()].map(write => write()))
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) console.warn(`[KVCardCache] ${failed}/${results.length} writes failed`)
  }

  async setCard(card: CardData): Promise<void> {
    await this.putCards([{ card }])
  }

  async deleteCard(id: string): Promise<void> {
    const card = await this.getCard(id)
    await this.kv.delete(ID_PREFIX + id)
    if (card) await this.kv.delete(NAME_PREFIX + normalizeCardName(card.name))
  }
}
