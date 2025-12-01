// app/components/Notifications/NotificationBadgeServer.tsx
import { getUnreadCount } from "@/app/serverActions/events/getUserEvents";
import { NotificationBadgeClient } from "./NotificationBadgeClient";
import type { AppContext } from "@/worker";

type NotificationBadgeServerProps = {
  ctx: AppContext;
};

export async function NotificationBadgeServer({ ctx }: NotificationBadgeServerProps) {
  if (!ctx.user?.id) return null;
  
  // This runs fresh every time renderRealtimeClients() is called
  const unreadCount = await getUnreadCount(ctx.user.id);
  
  return <NotificationBadgeClient unreadCount={unreadCount} userId={ctx.user.id} />;
}