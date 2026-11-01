// The deck store wired to the real DECKS_KV and eqosys. The logic is in deckStoreCore.ts.
import { env } from "cloudflare:workers"
import { eqosysToken, getSave, putSave } from "@/lib/eqosys"
import type { Deck } from "@/app/types/Deck"
import { makeDeckStore } from "./deckStoreCore"

export type StoredDeck = import("./deckStoreCore").StoredDeck<Deck>

// The binding is read per call, not when this module loads.
export const { listDeckIds, readDeck, writeDeck, removeDeck } = makeDeckStore<Deck>({
  kv: {
    get: key => env.DECKS_KV.get(key),
    getWithMetadata: <M>(key: string) => env.DECKS_KV.getWithMetadata<M>(key),
    put: (key, value, options) => env.DECKS_KV.put(key, value, options),
    delete: key => env.DECKS_KV.delete(key),
  },
  token: eqosysToken,
  getSave,
  putSave,
})
