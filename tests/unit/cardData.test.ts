// tests/unit/cardData.test.ts
// Deck imports go KV first, Scryfall for the rest. These pin the costs (bulk reads, full
// 75-card batches, nothing fetched twice) and the double-faced card path that used to lose
// both its image and its match.
import { afterEach, expect, test } from "bun:test";
import { CardDataService } from "../../src/app/services/cardData/CardDataService.ts";
import type { ICardProvider } from "../../src/app/services/cardData/ICardProvider.ts";
import { type CardStore, KVCardCache } from "../../src/app/services/cardData/KVCardCache.ts";
import { ScryfallProvider } from "../../src/app/services/cardData/providers/ScryfallProvider.ts";
import type { CardData, CardIdentifier } from "../../src/app/services/cardData/types.ts";

/** In-memory KV that counts calls, since calls are what KV bills. */
function fakeKV() {
  const data = new Map<string, string>();
  const calls = { get: 0, put: 0 };
  const store: CardStore = {
    async get(keys) {
      calls.get++;
      return new Map(keys.map((k) => [k, data.get(k) ?? null]));
    },
    async put(key, value) {
      calls.put++;
      data.set(key, value);
    },
    async delete(key) {
      data.delete(key);
    },
  };
  return { store, data, calls };
}

function card(name: string, extra: Partial<CardData> = {}): CardData {
  return {
    id: `id-${name.toLowerCase().replace(/\W+/g, "-")}`,
    name,
    cmc: 1,
    typeLine: "Instant",
    colorIdentity: [],
    setCode: "lea",
    setName: "Alpha",
    collectorNumber: "1",
    rarity: "common",
    imageUris: { normal: `https://cards.scryfall.io/${name}.jpg` },
    provider: "scryfall",
    lastUpdated: 0,
    ...extra,
  };
}

/** A provider that knows every name it is asked for, and records each batch. */
function fakeProvider(failBatches = 0) {
  const batches: CardIdentifier[][] = [];
  const provider: ICardProvider = {
    name: "fake",
    maxBatch: 75,
    async getCard(id) {
      return card(id);
    },
    async getCardByName(name) {
      return card(name);
    },
    async getCardsByIdentifiers(ids) {
      batches.push(ids);
      if (batches.length <= failBatches) throw new Error("429");
      return ids.map((i) => card(i.name!));
    },
    async getAllPrintings() {
      return [];
    },
  };
  return { provider, batches };
}

const names = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Card ${i}` }));

test("a 100-card import fetches in two batches, then comes back from two bulk KV reads", async () => {
  const kv = fakeKV();
  const { provider, batches } = fakeProvider();
  const service = new CardDataService(provider, new KVCardCache(kv.store));

  const first = await service.getCardsByIdentifiers([...names(100), { name: "Card 3" }]);
  expect(first).toHaveLength(100);
  expect(batches.map((b) => b.length)).toEqual([75, 25]);
  expect(kv.calls.put).toBe(200); // id + name per card, the repeated "Card 3" once

  kv.calls.get = 0;
  const again = await service.getCardsByIdentifiers(names(100));
  expect(again).toHaveLength(100);
  expect(batches).toHaveLength(2); // nothing new from the provider
  expect(kv.calls.get).toBe(2); // names → ids, ids → cards
});

test("a failed batch leaves its cards out; with nothing to show for it, the import throws", async () => {
  const partial = fakeProvider(1);
  const some = await new CardDataService(partial.provider, new KVCardCache(fakeKV().store))
    .getCardsByIdentifiers(names(80));
  expect(some).toHaveLength(5);

  const down: ICardProvider = { ...fakeProvider().provider, getCardsByIdentifiers: () => Promise.reject(new Error("down")) };
  await expect(new CardDataService(down, new KVCardCache(fakeKV().store)).getCardsByIdentifiers(names(3)))
    .rejects.toThrow("not answering");
});

test("a stripped card a draft export left in KV reads as a miss and is replaced", async () => {
  const kv = fakeKV();
  const stripped = card("Lightning Bolt", { provider: "draft-cube", oracleText: "" });
  kv.data.set(`card:id:${stripped.id}`, JSON.stringify(stripped));
  kv.data.set("card:name:lightning_bolt", stripped.id);
  const { provider, batches } = fakeProvider();

  const [bolt] = await new CardDataService(provider, new KVCardCache(kv.store))
    .getCardsByIdentifiers([{ name: "Lightning Bolt" }]);
  expect(batches).toHaveLength(1);
  expect(bolt?.provider).toBe("scryfall");
});

test("a typo Scryfall can't find is asked about once, not on every import", async () => {
  const kv = fakeKV();
  const { provider, batches } = fakeProvider();
  const real = provider.getCardsByIdentifiers;
  provider.getCardsByIdentifiers = async (ids) =>
    (await real(ids)).filter((c) => c.name !== "Lightnin Bolt");
  const service = new CardDataService(provider, new KVCardCache(kv.store));
  const deck = [{ name: "Lightnin Bolt" }, { name: "Counterspell" }];

  expect(await service.getCardsByIdentifiers(deck)).toHaveLength(1);
  expect(await service.getCardsByIdentifiers(deck)).toHaveLength(1);
  expect(batches).toHaveLength(1); // second import: the card from KV, the typo from its missing entry

  // A day later the entry has expired and Scryfall is asked again.
  kv.data.delete("card:missing:lightnin_bolt");
  await service.getCardsByIdentifiers(deck);
  expect(batches).toHaveLength(2);
  expect(batches[1]).toEqual([{ name: "Lightnin Bolt" }]);
});

test("a failed batch does not mark its names missing", async () => {
  const kv = fakeKV();
  const { provider } = fakeProvider(1);
  await new CardDataService(provider, new KVCardCache(kv.store)).getCardsByIdentifiers(names(80));
  expect([...kv.data.keys()].some((k) => k.startsWith("card:missing:"))).toBe(false);
});

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("a double-faced card keeps its front image and is found by its full name or its front face", async () => {
  const sent: unknown[] = [];
  const delver = {
    object: "card",
    id: "11bf83bb-c95b-4b4f-9a56-ce7a1816307a",
    oracle_id: "6b2b5f8b-0000-0000-0000-000000000000",
    name: "Delver of Secrets // Insectile Aberration",
    cmc: 1,
    type_line: "Creature — Human Wizard // Creature — Human Insect",
    color_identity: ["U"],
    set: "isd",
    set_name: "Innistrad",
    collector_number: "51",
    rarity: "common",
    legalities: {},
    prices: {},
    card_faces: [
      { object: "card_face", name: "Delver of Secrets", mana_cost: "{U}", type_line: "Creature — Human Wizard",
        image_uris: { normal: "https://cards.scryfall.io/normal/front/1/1/delver.jpg" } },
      { object: "card_face", name: "Insectile Aberration", mana_cost: "", type_line: "Creature — Human Insect",
        image_uris: { normal: "https://cards.scryfall.io/normal/back/1/1/delver.jpg" } },
    ],
  };
  globalThis.fetch = Object.assign(
    async (_url: string | URL | Request, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)));
      return Response.json({ object: "list", data: [delver], not_found: [] });
    },
    { preconnect: realFetch.preconnect },
  );

  const kv = fakeKV();
  const service = new CardDataService(new ScryfallProvider(), new KVCardCache(kv.store));
  // Moxfield-style full name: Scryfall's collection endpoint only matches the front face.
  const [first] = await service.getCardsByIdentifiers([{ name: delver.name }]);
  expect(sent).toEqual([{ identifiers: [{ name: "Delver of Secrets" }] }]);
  expect(first?.imageUris?.normal).toBe("https://cards.scryfall.io/normal/front/1/1/delver.jpg");
  expect(first?.manaCost).toBe("{U}");

  const [again] = await service.getCardsByIdentifiers([{ name: "delver of secrets" }]);
  expect(again?.id).toBe(delver.id);
  expect(sent).toHaveLength(1);
});
