// The session layer: who is this request? Rows live in the `session` table and the browser holds a signed
// cookie. The cookie name and signing match what better-auth writes (it still handles email/password,
// Google and Discord until those move over), so a session made by either side is read by both.
import { env } from "cloudflare:workers"
import { db } from "@/db"

const COOKIE = "better-auth.session_token"
const SECURE_COOKIE = `__Secure-${COOKIE}`
export const SESSION_SECONDS = 60 * 60 * 24 * 7

const encoder = new TextEncoder()

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(env.BETTER_AUTH_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)))
  let bin = ""
  for (const b of sig) bin += String.fromCharCode(b)
  return btoa(bin)
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

const isLocal = () => env.BETTER_AUTH_URL.includes("localhost")
const isSecure = () => env.BETTER_AUTH_URL.startsWith("https://")

/** The raw token inside the request's session cookie, or null when absent or the signature is wrong. */
export async function tokenFromHeaders(headers: Headers): Promise<string | null> {
  const jar = headers.get("cookie")
  if (!jar) return null
  for (const part of jar.split(";")) {
    const eq = part.indexOf("=")
    if (eq < 0) continue
    const name = part.slice(0, eq).trim()
    if (name !== COOKIE && name !== SECURE_COOKIE) continue
    let value: string
    try { value = decodeURIComponent(part.slice(eq + 1).trim()) } catch { return null }
    const dot = value.lastIndexOf(".")
    if (dot <= 0) return null
    const token = value.slice(0, dot)
    return (await hmac(token)) === value.slice(dot + 1) ? token : null
  }
  return null
}

/** The session row and its user for this request; null when signed out or the session has expired. */
export async function getSessionFromHeaders(headers: Headers) {
  const token = await tokenFromHeaders(headers)
  if (!token) return null
  const row = await db.session.findUnique({ where: { token }, include: { user: true } })
  if (!row || row.expiresAt.getTime() <= Date.now()) return null
  const { user, ...session } = row
  return { session, user }
}

/** Start a session for `userId`. Returns the Set-Cookie header value to send back. */
export async function createSession(userId: string, request: Request): Promise<string> {
  const token = randomToken()
  await db.session.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
      ipAddress: request.headers.get("cf-connecting-ip"),
      userAgent: request.headers.get("user-agent"),
    },
  })
  const value = encodeURIComponent(`${token}.${await hmac(token)}`)
  const attrs = [`Path=/`, `Max-Age=${SESSION_SECONDS}`, "HttpOnly", "SameSite=Lax"]
  if (isSecure()) attrs.push("Secure")
  if (!isLocal()) attrs.push("Domain=.qntbr.com")
  return `${isSecure() ? SECURE_COOKIE : COOKIE}=${value}; ${attrs.join("; ")}`
}
