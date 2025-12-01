// Scryfall API Types
// Documentation: https://scryfall.com/docs/api

// Card Object Types
export type Color = "W" | "U" | "B" | "R" | "G";

export type Rarity = "common" | "uncommon" | "rare" | "mythic" | "special" | "bonus";

export type Layout =
  | "normal"
  | "split"
  | "flip"
  | "transform"
  | "modal_dfc"
  | "meld"
  | "leveler"
  | "class"
  | "saga"
  | "adventure"
  | "planar"
  | "scheme"
  | "vanguard"
  | "token"
  | "double_faced_token"
  | "emblem"
  | "augment"
  | "host"
  | "art_series"
  | "reversible_card";

export type BorderColor = "black" | "white" | "borderless" | "silver" | "gold";

export type FrameEffect =
  | "legendary"
  | "miracle"
  | "nyxtouched"
  | "draft"
  | "devoid"
  | "tombstone"
  | "colorshifted"
  | "inverted"
  | "sunmoondfc"
  | "compasslanddfc"
  | "originpwdfc"
  | "mooneldrazidfc"
  | "waxingandwaningmoondfc"
  | "showcase"
  | "extendedart"
  | "companion"
  | "etched"
  | "snow"
  | "lesson"
  | "shatteredglass"
  | "convertdfc"
  | "fandfc"
  | "upsidedowndfc";

export type Game = "paper" | "arena" | "mtgo";

export type Legality = "legal" | "not_legal" | "restricted" | "banned";

export interface Legalities {
  standard: Legality;
  future: Legality;
  historic: Legality;
  timeless: Legality;
  gladiator: Legality;
  pioneer: Legality;
  explorer: Legality;
  modern: Legality;
  legacy: Legality;
  pauper: Legality;
  vintage: Legality;
  penny: Legality;
  commander: Legality;
  oathbreaker: Legality;
  standardbrawl: Legality;
  brawl: Legality;
  alchemy: Legality;
  paupercommander: Legality;
  duel: Legality;
  oldschool: Legality;
  premodern: Legality;
  predh: Legality;
}

export interface ImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}

export interface Prices {
  usd: string | null;
  usd_foil: string | null;
  usd_etched: string | null;
  eur: string | null;
  eur_foil: string | null;
  tix: string | null;
}

export interface PurchaseUris {
  tcgplayer?: string;
  cardmarket?: string;
  cardhoarder?: string;
}

export interface RelatedUris {
  gatherer?: string;
  tcgplayer_infinite_articles?: string;
  tcgplayer_infinite_decks?: string;
  edhrec?: string;
}

export interface CardFace {
  object: "card_face";
  name: string;
  mana_cost: string;
  type_line: string;
  oracle_text?: string;
  colors?: Color[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  flavor_text?: string;
  artist?: string;
  artist_id?: string;
  illustration_id?: string;
  image_uris?: ImageUris;
}

export interface RelatedCard {
  id: string;
  object: "related_card";
  component: "token" | "meld_part" | "meld_result" | "combo_piece";
  name: string;
  type_line: string;
  uri: string;
}

export interface Card {
  // Core Fields
  object: "card";
  id: string;
  oracle_id: string;
  multiverse_ids?: number[];
  mtgo_id?: number;
  mtgo_foil_id?: number;
  tcgplayer_id?: number;
  cardmarket_id?: number;
  name: string;
  lang: string;
  released_at: string;
  uri: string;
  scryfall_uri: string;
  layout: Layout;

  // Gameplay Fields
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  colors?: Color[];
  color_identity: Color[];
  color_indicator?: Color[];
  keywords: string[];
  legalities: Legalities;
  games: Game[];
  reserved: boolean;
  foil: boolean;
  nonfoil: boolean;
  finishes: ("foil" | "nonfoil" | "etched")[];
  oversized: boolean;
  promo: boolean;
  reprint: boolean;
  variation: boolean;
  set_id: string;
  set: string;
  set_name: string;
  set_type: string;
  set_uri: string;
  set_search_uri: string;
  scryfall_set_uri: string;
  rulings_uri: string;
  prints_search_uri: string;
  collector_number: string;
  digital: boolean;
  rarity: Rarity;
  card_back_id?: string;
  artist?: string;
  artist_ids?: string[];
  illustration_id?: string;
  border_color: BorderColor;
  frame: string;
  frame_effects?: FrameEffect[];
  security_stamp?: "oval" | "triangle" | "acorn" | "arena" | "heart";
  full_art: boolean;
  textless: boolean;
  booster: boolean;
  story_spotlight: boolean;
  edhrec_rank?: number;
  penny_rank?: number;
  preview?: {
    source: string;
    source_uri: string;
    previewed_at: string;
  };

  // Price Fields
  prices: Prices;
  related_uris: RelatedUris;
  purchase_uris?: PurchaseUris;

  // Multi-faced Cards
  card_faces?: CardFace[];
  all_parts?: RelatedCard[];

  // Image Fields
  image_uris?: ImageUris;
  image_status: "missing" | "placeholder" | "lowres" | "highres_scan";

  // Flavor & Print Fields
  flavor_name?: string;
  flavor_text?: string;
  produced_mana?: Color[];
  watermark?: string;
  content_warning?: boolean;
  attraction_lights?: number[];
}

// List Response Types
export interface ScryfallList<T> {
  object: "list";
  data: T[];
  has_more: boolean;
  next_page?: string;
  total_cards?: number;
  warnings?: string[];
}

// Set Object Types
export type SetType =
  | "core"
  | "expansion"
  | "masters"
  | "alchemy"
  | "masterpiece"
  | "arsenal"
  | "from_the_vault"
  | "spellbook"
  | "premium_deck"
  | "duel_deck"
  | "draft_innovation"
  | "treasure_chest"
  | "commander"
  | "planechase"
  | "archenemy"
  | "vanguard"
  | "funny"
  | "starter"
  | "box"
  | "promo"
  | "token"
  | "memorabilia"
  | "minigame";

export interface Set {
  object: "set";
  id: string;
  code: string;
  mtgo_code?: string;
  arena_code?: string;
  tcgplayer_id?: number;
  name: string;
  set_type: SetType;
  released_at?: string;
  block_code?: string;
  block?: string;
  parent_set_code?: string;
  card_count: number;
  printed_size?: number;
  digital: boolean;
  foil_only: boolean;
  nonfoil_only: boolean;
  scryfall_uri: string;
  uri: string;
  icon_svg_uri: string;
  search_uri: string;
}

// Ruling Object Types
export interface Ruling {
  object: "ruling";
  oracle_id: string;
  source: "wotc" | "scryfall";
  published_at: string;
  comment: string;
}

// Symbol Object Types
export interface ManaCostSymbol {
  object: "card_symbol";
  symbol: string;
  svg_uri: string;
  loose_variant?: string;
  english: string;
  transposable: boolean;
  represents_mana: boolean;
  appears_in_mana_costs: boolean;
  cmc?: number;
  funny: boolean;
  colors: Color[];
  gatherer_alternates?: string[];
}

// Catalog Object Types
export interface Catalog {
  object: "catalog";
  uri: string;
  total_values: number;
  data: string[];
}

// Bulk Data Object Types
export type BulkDataType =
  | "oracle_cards"
  | "unique_artwork"
  | "default_cards"
  | "all_cards"
  | "rulings";

export interface BulkData {
  object: "bulk_data";
  id: string;
  type: BulkDataType;
  updated_at: string;
  uri: string;
  name: string;
  description: string;
  download_uri: string;
  size: number;
  content_type: string;
  content_encoding: string;
}

// Search and Query Types
export type SearchOrder =
  | "name"
  | "set"
  | "released"
  | "rarity"
  | "color"
  | "usd"
  | "tix"
  | "eur"
  | "cmc"
  | "power"
  | "toughness"
  | "edhrec"
  | "penny"
  | "artist"
  | "review";

export type SortDirection = "auto" | "asc" | "desc";

export type UniqueMode = "cards" | "art" | "prints";

export interface SearchParams {
  q: string;
  unique?: UniqueMode;
  order?: SearchOrder;
  dir?: SortDirection;
  include_extras?: boolean;
  include_multilingual?: boolean;
  include_variations?: boolean;
  page?: number;
}

// Named Card Search
export interface NamedCardParams {
  exact?: string;
  fuzzy?: string;
  set?: string;
}

// Autocomplete
export interface AutocompleteParams {
  q: string;
  include_extras?: boolean;
}

// Random Card
export interface RandomCardParams {
  q?: string;
}

// Collection/Identifier Types
export interface CardIdentifier {
  id?: string;
  mtgo_id?: number;
  multiverse_id?: number;
  oracle_id?: string;
  illustration_id?: string;
  name?: string;
  set?: string;
  collector_number?: string;
}

export interface CollectionRequest {
  identifiers: CardIdentifier[];
}

// Error Types
export interface ScryfallError {
  object: "error";
  code: string;
  status: number;
  details: string;
  type?: string;
  warnings?: string[];
}

export interface EnrichedCard extends Card {
    validatedImageUrl?: string | null;
  }