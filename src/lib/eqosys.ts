// eqosys cloud saves (apps/eqosys/src/saves.ts in RustyBuns): PUT/GET /q/save/<slot> with the person's eqosys access token as a bearer.
// The token is the one Better Auth stored when they signed in with eqosys (src/lib/auth.ts); it hands out a fresh one when it has
// expired, which needs the offline_access scope.
import { env } from "cloudflare:workers"
import { requestInfo } from "rwsdk/worker"
import { auth } from "@/lib/auth"
import { db } from "@/db"

/** The bearer for the signed-in person, or null when they never signed in with eqosys (or eqosys isn't set up). */
export async function eqosysToken(userId: string): Promise<string | null> {
  if (!env.EQOSYS_URL) return null
  try {
    const link = await db.account.findFirst({ where: { userId, providerId: "eqosys" }, select: { id: true } })
    if (!link) return null
    const { accessToken } = await auth.api.getAccessToken({
      body: { accountId: link.id },
      headers: requestInfo.request.headers,
    })
    return accessToken || null
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
