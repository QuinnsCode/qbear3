// Sign in with eqosys, the one account across every Q app (RustyBuns apps/eqosys): OpenID Connect with PKCE
// and no client secret; "qntbr" is this site's id in its APPS. `startEqosys` sends the browser to eqosys,
// `finishEqosys` turns the answer into a session (src/lib/session.ts).
//
// The id_token says email_verified: false for an email-and-password sign-up at eqosys, so an eqosys login never
// attaches to an existing user by email: someone who signs up there with your address doesn't get into your
// account here. A returning eqosys sub finds its own user; a new one with a taken email is turned away.
import { env } from "cloudflare:workers"
import { db } from "@/db"
import { createSession } from "@/lib/session"

const CLIENT_ID = "qntbr"
const STATE_COOKIE = "qntbr_eqosys"
const SCOPES = "openid email profile offline_access"

/** The redirect URI registered at eqosys (it is the one better-auth's genericOAuth used). */
export const EQOSYS_CALLBACK_PATH = "/api/auth/oauth2/callback/eqosys"
const redirectUri = () => `${env.BETTER_AUTH_URL}${EQOSYS_CALLBACK_PATH}`

interface Discovery { authorization_endpoint: string; token_endpoint: string }

function isString(v: unknown): v is string { return typeof v === "string" && v.length > 0 }

async function discover(): Promise<Discovery> {
  const res = await fetch(`${env.EQOSYS_URL}/.well-known/openid-configuration`)
  if (!res.ok) throw new Error(`eqosys discovery answered ${res.status}`)
  const body: unknown = await res.json()
  if (typeof body !== "object" || body === null) throw new Error("eqosys discovery is not an object")
  const authorization_endpoint = Reflect.get(body, "authorization_endpoint")
  const token_endpoint = Reflect.get(body, "token_endpoint")
  if (!isString(authorization_endpoint) || !isString(token_endpoint)) throw new Error("eqosys discovery is missing endpoints")
  return { authorization_endpoint, token_endpoint }
}

function b64url(bytes: Uint8Array): string {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
const randomString = () => b64url(crypto.getRandomValues(new Uint8Array(32)))

/** Only same-site paths and *.qntbr.com (or *.localhost when running locally) addresses; anything else becomes "/". */
export function safeCallback(raw: string | null, request: Request): string {
  if (!raw) return "/"
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) return raw
  try {
    const u = new URL(raw)
    const local = u.hostname === "localhost" || u.hostname.endsWith(".localhost")
    if (u.hostname === "qntbr.com" || u.hostname.endsWith(".qntbr.com") || (local && new URL(request.url).hostname.endsWith("localhost"))) return u.href
  } catch { /* not a URL */ }
  return "/"
}

const stateCookie = (value: string, maxAge: number) =>
  `${STATE_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${env.BETTER_AUTH_URL.startsWith("https://") ? "; Secure" : ""}`

/** 302 to eqosys's authorize endpoint, with the PKCE verifier and state parked in a short cookie. */
export async function startEqosys(request: Request): Promise<Response> {
  if (!env.EQOSYS_URL) return new Response("eqosys sign-in is not set up", { status: 404 })
  const { authorization_endpoint } = await discover()
  const state = randomString()
  const verifier = randomString()
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))))
  const callbackURL = safeCallback(new URL(request.url).searchParams.get("callbackURL"), request)
  const to = new URL(authorization_endpoint)
  to.search = new URLSearchParams({
    response_type: "code", client_id: CLIENT_ID, redirect_uri: redirectUri(), scope: SCOPES,
    state, code_challenge: challenge, code_challenge_method: "S256",
  }).toString()
  const headers = new Headers({ location: to.href })
  headers.append("set-cookie", stateCookie(encodeURIComponent(JSON.stringify({ state, verifier, callbackURL })), 600))
  return new Response(null, { status: 302, headers })
}

function readStateCookie(request: Request): { state: string; verifier: string; callbackURL: string } | null {
  const jar = request.headers.get("cookie") ?? ""
  const hit = jar.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${STATE_COOKIE}=`))
  if (!hit) return null
  try {
    const v: unknown = JSON.parse(decodeURIComponent(hit.slice(STATE_COOKIE.length + 1)))
    if (typeof v !== "object" || v === null) return null
    const state = Reflect.get(v, "state")
    const verifier = Reflect.get(v, "verifier")
    const callbackURL = Reflect.get(v, "callbackURL")
    return isString(state) && isString(verifier) && isString(callbackURL) ? { state, verifier, callbackURL } : null
  } catch { return null }
}

interface Claims { sub: string; email: string | null; name: string | null; picture: string | null }

function claimsOf(idToken: string): Claims | null {
  const part = idToken.split(".")[1]
  if (!part) return null
  try {
    const c: unknown = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")))
    if (typeof c !== "object" || c === null) return null
    const aud = Reflect.get(c, "aud")
    if (aud !== CLIENT_ID && !(Array.isArray(aud) && aud.includes(CLIENT_ID))) return null
    const exp = Reflect.get(c, "exp")
    if (typeof exp === "number" && exp * 1000 < Date.now()) return null
    const sub = Reflect.get(c, "sub")
    if (!isString(sub)) return null
    const str = (k: string) => { const v = Reflect.get(c, k); return isString(v) ? v : null }
    return { sub, email: str("email"), name: str("name"), picture: str("picture") }
  } catch { return null }
}

interface Tokens { accessToken: string; refreshToken: string | null; idToken: string | null; expiresAt: Date | null; scope: string | null }

/** The token endpoint's JSON, narrowed. The id_token came straight from eqosys over TLS, so its claims are read, not re-verified. */
function tokensOf(body: unknown): Tokens | null {
  if (typeof body !== "object" || body === null) return null
  const str = (k: string) => { const v = Reflect.get(body, k); return isString(v) ? v : null }
  const accessToken = str("access_token")
  if (!accessToken) return null
  const expiresIn = Reflect.get(body, "expires_in")
  return {
    accessToken,
    refreshToken: str("refresh_token"),
    idToken: str("id_token"),
    expiresAt: typeof expiresIn === "number" ? new Date(Date.now() + expiresIn * 1000) : null,
    scope: str("scope"),
  }
}

const fail = (request: Request, why: string) => {
  const to = new URL("/user/login", request.url)
  to.searchParams.set("error", why)
  const headers = new Headers({ location: to.href })
  headers.append("set-cookie", stateCookie("", 0))
  return new Response(null, { status: 302, headers })
}

/** Finish the sign-in: swap the code for tokens, find or create the user, start a session, go on to callbackURL. */
export async function finishEqosys(request: Request): Promise<Response> {
  if (!env.EQOSYS_URL) return new Response("eqosys sign-in is not set up", { status: 404 })
  const url = new URL(request.url)
  const saved = readStateCookie(request)
  const code = url.searchParams.get("code")
  if (!saved || !code || url.searchParams.get("state") !== saved.state) return fail(request, "eqosys_state")

  const { token_endpoint } = await discover()
  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: CLIENT_ID, redirect_uri: redirectUri(), code_verifier: saved.verifier }),
  })
  if (!res.ok) return fail(request, "eqosys_token")
  const tokens = tokensOf(await res.json())
  const claims = tokens?.idToken ? claimsOf(tokens.idToken) : null
  if (!tokens || !claims) return fail(request, "eqosys_token")

  const link = await db.account.findFirst({ where: { providerId: "eqosys", accountId: claims.sub } })
  let userId = link?.userId
  if (!userId) {
    if (claims.email && (await db.user.findUnique({ where: { email: claims.email }, select: { id: true } }))) return fail(request, "eqosys_email_taken")
    const user = await db.user.create({
      data: { email: claims.email, name: claims.name ?? claims.email?.split("@")[0] ?? "eqosys", image: claims.picture, role: "admin" },
    })
    userId = user.id
  }
  const data = {
    accessToken: tokens.accessToken, idToken: tokens.idToken, accessTokenExpiresAt: tokens.expiresAt, scope: tokens.scope,
    // eqosys may not send a new refresh token; keep the old one then
    ...(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
  }
  if (link) await db.account.update({ where: { id: link.id }, data })
  else await db.account.create({ data: { ...data, userId, providerId: "eqosys", accountId: claims.sub } })

  const headers = new Headers({ location: new URL(saved.callbackURL, request.url).href })
  headers.append("set-cookie", await createSession(userId, request))
  headers.append("set-cookie", stateCookie("", 0))
  return new Response(null, { status: 302, headers })
}

/** A bearer for this user's saved decks, refreshed when the stored one is within a minute of expiring. Null if they never linked eqosys. */
export async function eqosysAccessToken(userId: string): Promise<string | null> {
  const link = await db.account.findFirst({ where: { userId, providerId: "eqosys" } })
  if (!link?.accessToken) return null
  if (!link.accessTokenExpiresAt || link.accessTokenExpiresAt.getTime() - 60_000 > Date.now()) return link.accessToken
  if (!link.refreshToken) return null
  const { token_endpoint } = await discover()
  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: link.refreshToken, client_id: CLIENT_ID }),
  })
  if (!res.ok) return null
  const fresh = tokensOf(await res.json())
  if (!fresh) return null
  await db.account.update({
    where: { id: link.id },
    data: { accessToken: fresh.accessToken, accessTokenExpiresAt: fresh.expiresAt, ...(fresh.refreshToken ? { refreshToken: fresh.refreshToken } : {}) },
  })
  return fresh.accessToken
}
