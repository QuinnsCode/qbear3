// app/lib/scryfallImage.ts
// Builds Scryfall CDN image URLs straight from a Scryfall card id so the UI
// always has something to render even when a card's cached imageUrl is missing.

export type ScryfallImageSize = 'small' | 'normal' | 'large' | 'png' | 'art_crop' | 'border_crop'

export function scryfallImageUrl(scryfallId: string | undefined, size: ScryfallImageSize = 'normal'): string {
  if (!scryfallId || scryfallId.length < 2) return ''
  const id = scryfallId.toLowerCase()
  const ext = size === 'png' ? 'png' : 'jpg'
  return `https://cards.scryfall.io/${size}/front/${id[0]}/${id[1]}/${id}.${ext}`
}

/** Prefer the stored image, fall back to the Scryfall CDN. */
export function cardImage(card: { scryfallId?: string; imageUrl?: string | null }, size: ScryfallImageSize = 'normal'): string {
  return card.imageUrl || scryfallImageUrl(card.scryfallId, size)
}
