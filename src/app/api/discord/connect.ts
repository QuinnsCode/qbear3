// app/api/discord/connect.ts
// GET /api/discord/connect - Check if user has Discord connected
import { db } from "@/db";
import type { AppContext } from "@/worker";

export default async ({ ctx }: { ctx: AppContext }) => {
    if (!ctx.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  
    // Check if user has Discord account linked
    const discordAccount = await db.account.findFirst({
      where: {
        userId: ctx.user.id,
        providerId: "discord",
      },
    });
  
    return Response.json({
      connected: !!discordAccount,
      discordId: discordAccount?.accountId,
    });
  };