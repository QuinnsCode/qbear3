// src/lib/tableCall.ts
// One qlave (qlave.dev) video room per game table or draft pod. qlave's createRoom is keyed by an
// externalId and answers the same room code for the same id; we also remember the code in the game
// registry so most joins never call qlave.
import { env } from "cloudflare:workers";

export type CallKind = "cardGame" | "draft";

const DEFAULT_QLAVE_URL = "https://qlave.dev";
/** qlave rooms are not forever; ask again after this and createRoom hands back (or recreates) the room. */
const CACHE_TTL_SECONDS = 12 * 60 * 60;

export function isCallKind(value: string | undefined): value is CallKind {
  return value === "cardGame" || value === "draft";
}

/** The same id qlave sees for the same table, every time. */
export function externalIdFor(kind: CallKind, id: string): string {
  return `qntbr:${kind}:${id}`;
}

export type TableCall = { ok: true; code: string; url: string } | { ok: false; status: number; error: string };

function qlaveBase(): string {
  return (env.QLAVE_URL || DEFAULT_QLAVE_URL).replace(/\/+$/, "");
}

function joinUrl(code: string): string {
  return `${qlaveBase()}/s/${encodeURIComponent(code)}`;
}

/** A qlave reply is unknown until a code string is found in it. */
function roomCodeFrom(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const code = "code" in body ? body.code : "roomCode" in body ? body.roomCode : undefined;
  return typeof code === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(code) ? code : undefined;
}

/** The join link for a table's call, creating the qlave room the first time. */
export async function tableCall(kind: CallKind, id: string): Promise<TableCall> {
  const key = `tableCall:${kind}:${id}`;
  const kv = env.CARD_GAME_REGISTRY_KV;
  const cached = await kv.get(key);
  if (cached) return { ok: true, code: cached, url: joinUrl(cached) };

  if (!env.QLAVE_API_KEY) return { ok: false, status: 503, error: "Video calls are not set up" };
  let res: Response;
  try {
    res = await fetch(`${qlaveBase()}/api/qlave/createRoom`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.QLAVE_API_KEY}` },
      body: JSON.stringify({ externalId: externalIdFor(kind, id) }),
    });
  } catch {
    return { ok: false, status: 502, error: "Could not reach the call service" };
  }
  const code = res.ok ? roomCodeFrom(await res.json().catch(() => undefined)) : undefined;
  if (!code) return { ok: false, status: 502, error: "The call service did not give a room" };
  await kv.put(key, code, { expirationTtl: CACHE_TTL_SECONDS });
  return { ok: true, code, url: joinUrl(code) };
}
