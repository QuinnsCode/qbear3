// src/lib/regions.ts
// Region → Cloudflare DO locationHint. Mirrors the qntbr regions file's `hint`
// field. A realm's World.region drives where its DO is created, so a realm
// lands near its intended players by construction instead of near whoever
// happens to connect first.

export type DurableObjectLocationHint =
  | "wnam" | "enam" | "sam" | "weur" | "eeur" | "apac" | "oc" | "afr" | "me";

const REGION_TO_HINT: Record<string, DurableObjectLocationHint> = {
  "us-east": "enam",
  "us-west": "wnam",
  "europe": "weur",
  "asia": "apac",
  "south-america": "sam",
};

/** Hint for a World.region, or undefined to let the platform place it naturally. */
export function hintForRegion(region: string): DurableObjectLocationHint | undefined {
  return REGION_TO_HINT[region];
}