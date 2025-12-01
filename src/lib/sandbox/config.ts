// @/lib/sandbox/config.ts

export const SANDBOX_CONFIG = {
  GAME_ID: 'sandbox-shared-game',
  MAX_PLAYERS: 256,
  SHARED_BATTLEFIELD: true,
  AUTO_ASSIGN_DECK: true,
} as const;

export const SANDBOX_STARTER_DECKS = [
  {
    id: 'red-aggro',
    deckName: 'Red Deck Wins',
    cards: [
      { name: 'Goblin Guide', quantity: 4 },
      { name: 'Monastery Swiftspear', quantity: 4 },
      { name: 'Eidolon of the Great Revel', quantity: 4 },
      { name: 'Lightning Bolt', quantity: 4 },
      { name: 'Lava Spike', quantity: 4 },
      { name: 'Rift Bolt', quantity: 4 },
      { name: 'Light Up the Stage', quantity: 4 },
      { name: 'Skullcrack', quantity: 4 },
      { name: 'Mountain', quantity: 20 },
    ]
  },
  {
    id: 'blue-control',
    deckName: 'Blue Control',
    cards: [
      { name: 'Snapcaster Mage', quantity: 4 },
      { name: 'Counterspell', quantity: 4 },
      { name: 'Mana Leak', quantity: 4 },
      { name: 'Brainstorm', quantity: 4 },
      { name: 'Ponder', quantity: 4 },
      { name: 'Fact or Fiction', quantity: 4 },
      { name: 'Supreme Verdict', quantity: 4 },
      { name: 'Jace, the Mind Sculptor', quantity: 2 },
      { name: 'Island', quantity: 24 },
    ]
  },
  {
    id: 'green-ramp',
    deckName: 'Green Ramp',
    cards: [
      { name: 'Llanowar Elves', quantity: 4 },
      { name: 'Sakura-Tribe Elder', quantity: 4 },
      { name: 'Cultivate', quantity: 4 },
      { name: 'Kodama\'s Reach', quantity: 4 },
      { name: 'Primeval Titan', quantity: 4 },
      { name: 'Craterhoof Behemoth', quantity: 2 },
      { name: 'Beast Within', quantity: 4 },
      { name: 'Harmonize', quantity: 4 },
      { name: 'Forest', quantity: 26 },
    ]
  },
  {
    id: 'white-weenie',
    deckName: 'White Weenie',
    cards: [
      { name: 'Savannah Lions', quantity: 4 },
      { name: 'Student of Warfare', quantity: 4 },
      { name: 'Thalia, Guardian of Thraben', quantity: 4 },
      { name: 'Mirran Crusader', quantity: 4 },
      { name: 'Hero of Bladehold', quantity: 4 },
      { name: 'Path to Exile', quantity: 4 },
      { name: 'Swords to Plowshares', quantity: 4 },
      { name: 'Honor of the Pure', quantity: 4 },
      { name: 'Plains', quantity: 22 },
    ]
  },
] as const;