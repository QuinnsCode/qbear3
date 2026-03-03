// app/pages/user/CreateLairPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import CreateLairClient from "./CreateLairClient";
import {
  FantasyBackground,
  FantasyCard,
  FantasyTitle,
  FantasyText
} from "@/app/components/theme/FantasyTheme";
import { extractOrgFromSubdomain } from "@/lib/middlewareFunctions";

export default async function CreateLairPage({ ctx, request }: RequestInfo) {
  // Check if we're on a subdomain (server-side)
  const orgSlug = extractOrgFromSubdomain(request);

  // If on subdomain, redirect to main domain
  if (orgSlug) {
    const currentUrl = new URL(request.url);
    const protocol = currentUrl.protocol;
    const mainDomain = currentUrl.hostname.includes('localhost')
      ? 'localhost:5173'
      : currentUrl.hostname.split('.').slice(-2).join('.');
    const pathname = currentUrl.pathname;

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${protocol}//${mainDomain}${pathname}`
      }
    });
  }

  // User must be logged in to create a lair
  if (!ctx.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/user/login' }
    });
  }

  // Check if user already has an org (shouldn't happen, but just in case)
  const { getCachedUserMemberships } = await import('@/lib/cache/authCache');
  const memberships = await getCachedUserMemberships(ctx.user.id);

  if (memberships.length > 0) {
    // User already has an org, redirect to sanctum
    const membership = memberships[0];
    const { getCachedOrganization } = await import('@/lib/cache/authCache');
    const org = await getCachedOrganization(membership.organizationId);

    if (org) {
      const currentUrl = new URL(request.url);
      const protocol = currentUrl.protocol;
      const hostname = currentUrl.hostname;

      let redirectUrl: string;
      if (hostname.includes('localhost')) {
        const port = currentUrl.port || '5173';
        redirectUrl = `${protocol}//${org.slug}.localhost:${port}/sanctum`;
      } else if (hostname.includes('workers.dev')) {
        const workerDomain = hostname.split('.').slice(-3).join('.');
        redirectUrl = `${protocol}//${org.slug}.${workerDomain}/sanctum`;
      } else {
        redirectUrl = `${protocol}//${org.slug}.qntbr.com/sanctum`;
      }

      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl }
      });
    }
  }

  // All checks passed - render the client component
  return (
    <CreateLairClient
      userId={ctx.user.id}
      userName={ctx.user.name || ''}
      userEmail={ctx.user.email || ''}
    />
  );
}
