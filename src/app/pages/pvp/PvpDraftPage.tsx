// app/pages/pvp/PvpDraftPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { createDraft } from "@/app/serverActions/draft/createDraft";
import { getRegionConfig } from "@/app/lib/constants/regions";

export default async function PvpDraftPage({ ctx, request, params }: RequestInfo) {
  const region = params.region as string;
  const regionConfig = getRegionConfig(region);

  // Validate region
  if (!regionConfig) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/pvp' }
    });
  }

  // Require authentication
  if (!ctx.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/user/login' }
    });
  }

  // Create new draft
  const result = await createDraft({
    userId: ctx.user.id,
    userName: ctx.user.name || ctx.user.email || 'Player',
  });

  if (!result.success || !result.draftId) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/pvp?error=${encodeURIComponent(result.error || 'Failed to create draft')}`
      }
    });
  }

  // Redirect to draft page with PVP region context
  const url = new URL(request.url);
  const draftUrl = `/draft/${result.draftId}?pvpRegion=${region}&returnTo=/pvp/lobby/${region}`;

  return new Response(null, {
    status: 302,
    headers: { Location: draftUrl }
  });
}
