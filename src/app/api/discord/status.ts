// app/api/discord/status.ts
import { db } from "@/db";
import type { AppContext } from "@/worker";

export default async ({ ctx }: { ctx: AppContext }) => {
  if (!ctx.user) {
    return Response.json({ connected: false });
  }

  try {
    const discordAccount = await db.account.findFirst({
      where: {
        userId: ctx.user.id,
        providerId: "discord"
      }
    });

    return Response.json({
      connected: !!discordAccount,
      discordId: discordAccount?.accountId,
    });
  } catch (error) {
    console.error('Failed to check Discord status:', error);
    return Response.json({ connected: false, error: 'Failed to check status' });
  }
};