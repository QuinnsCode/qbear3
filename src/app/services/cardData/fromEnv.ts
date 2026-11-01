// src/app/services/cardData/fromEnv.ts
// The card service over this request's bindings. Server-only: server actions, routes and DOs
// build theirs here instead of wiring provider + cache each time.
import * as workers from "cloudflare:workers"
import { CardDataService, type Defer } from './CardDataService'
import { KVCardCache } from './KVCardCache'
import { ScryfallProvider } from './providers/ScryfallProvider'

/** Cache writes after the reply where the runtime has waitUntil; awaited otherwise. */
const defer: Defer | undefined = typeof workers.waitUntil === 'function' ? workers.waitUntil : undefined

export function cardCache(kv: KVNamespace | undefined = workers.env?.CARDS_KV): KVCardCache {
  if (!kv) throw new Error('CARDS_KV binding not found')
  return new KVCardCache(kv)
}

export function cardDataService(kv?: KVNamespace): CardDataService {
  return new CardDataService(new ScryfallProvider(), cardCache(kv), defer)
}
