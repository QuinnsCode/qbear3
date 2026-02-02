// app/pages/admin/CacheBrowserPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { CacheBrowserClient } from "@/app/components/Admin/CacheBrowserClient";
import { isSuperAdmin } from "@/lib/auth/adminCheck";

export default async function CacheBrowserPage({ ctx, request }: RequestInfo) {
  // Require authentication
  if (!ctx.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/user/login' }
    });
  }

  // Require super admin access
  if (!isSuperAdmin(ctx.user)) {
    return new Response('Forbidden: Super admin access required', {
      status: 403
    });
  }

  return <CacheBrowserClient />;
}
