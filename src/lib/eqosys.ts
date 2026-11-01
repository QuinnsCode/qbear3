// eqosys cloud saves (apps/eqosys/src/saves.ts in RustyBuns): PUT/GET /q/save/<slot> with the person's eqosys access token as a bearer.
// The token is the one stored when they signed in with eqosys (src/lib/eqosysAuth.ts), refreshed there when it has
// expired, which needs the offline_access scope.
import { env } from "cloudflare:workers"
import { eqosysAccessToken } from "@/lib/eqosysAuth"

/** The bearer for the signed-in person, or null when they never signed in with eqosys (or eqosys isn't set up). */
export async function eqosysToken(userId: string): Promise<string | null> {
  if (!env.EQOSYS_URL) return null
  try {
    return await eqosysAccessToken(userId)
  } catch (error) {
    console.error("[eqosys] no access token:", error)
    return null
  }
}

export type SaveResult = { ok: true } | { ok: false; status: number; error: string }

export async function putSave(token: string, slot: string, body: string): Promise<SaveResult> {
  const res = await fetch(`${env.EQOSYS_URL}/q/save/${slot}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/octet-stream" },
    body,
  })
  if (res.ok) return { ok: true }
  const text = await res.text().catch(() => "")
  return { ok: false, status: res.status, error: text || `eqosys answered ${res.status}` }
}

/** The newest version of a slot as text; null when the slot is empty. Anything else throws, so a hiccup isn't read as "no decks". */
export async function getSave(token: string, slot: string): Promise<string | null> {
  const res = await fetch(`${env.EQOSYS_URL}/q/save/${slot}`, { headers: { authorization: `Bearer ${token}` } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`eqosys answered ${res.status} for ${slot}`)
  return res.text()
}
