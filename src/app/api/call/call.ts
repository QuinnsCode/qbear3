// src/app/api/call/call.ts
// POST /api/call/:kind/:id -> { url }
// The video call for a game table (kind "cardGame") or draft pod (kind "draft"): one qlave room each.
import { env } from "cloudflare:workers";
import { isCallKind, tableCall, type CallKind } from "@/lib/tableCall";

interface Info {
  request: Request;
  params: Record<string, string>;
  ctx: { user?: { id: string } | null };
}

const ID = /^[A-Za-z0-9_-]{1,100}$/;

async function tableExists(kind: CallKind, id: string, viewer: string): Promise<boolean> {
  if (kind === "draft") {
    const stub = env.DRAFT_DO.get(env.DRAFT_DO.idFromName(id));
    return (await stub.fetch(`https://fake-host/for?viewer=${encodeURIComponent(viewer)}`)).ok;
  }
  const stub = env.CARD_GAME_STATE_DO.get(env.CARD_GAME_STATE_DO.idFromName(id));
  const state: unknown = await (await stub.fetch(new Request("https://fake-host/"))).json().catch(() => undefined);
  return typeof state === "object" && state !== null && "players" in state && Array.isArray(state.players) && state.players.length > 0;
}

function guestIdFromCookie(draftId: string, cookies: string | null): string | undefined {
  const prefix = `draft_user_${draftId}=`;
  return cookies?.split(";").map((c) => c.trim()).find((c) => c.startsWith(prefix))?.slice(prefix.length) || undefined;
}

export default async function handler({ request, params, ctx }: Info): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "POST" }, { status: 405 });
  const { kind, id } = params;
  if (!isCallKind(kind) || !id || !ID.test(id)) return Response.json({ error: "Unknown table" }, { status: 404 });

  // Draft guests have a cookie id; a card game needs a signed-in player or is a sandbox table.
  const viewer = ctx.user?.id ?? (kind === "draft" ? guestIdFromCookie(id, request.headers.get("cookie")) : undefined);
  if (!viewer && !(kind === "cardGame" && id.startsWith("sandbox-"))) {
    return Response.json({ error: "Sit at the table to join its call" }, { status: 401 });
  }
  if (!(await tableExists(kind, id, viewer ?? "sandbox"))) return Response.json({ error: "Unknown table" }, { status: 404 });

  const call = await tableCall(kind, id);
  return call.ok ? Response.json({ url: call.url }) : Response.json({ error: call.error }, { status: call.status });
}
