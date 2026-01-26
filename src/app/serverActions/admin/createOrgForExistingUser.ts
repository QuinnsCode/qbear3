// @/app/serverActions/admin/createOrgForExistingUser.ts
"use server";

import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { initializeServices } from "@/lib/middlewareFunctions";

function getRedirectUrl(slug: string, request: Request): string {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const protocol = url.protocol;
  
  // Local development (localhost)
  if (hostname.includes('localhost')) {
    const port = url.port || '5173';
    return `${protocol}//${slug}.localhost:${port}/sanctum`;
  }
  
  // Wrangler dev (workers.dev)
  if (hostname.includes('workers.dev')) {
    const workerDomain = hostname.split('.').slice(-3).join('.');
    return `${protocol}//${slug}.${workerDomain}/sanctum`;
  }
  
  // Production (qntbr.com)
  return `${protocol}//${slug}.qntbr.com/sanctum`;
}

export async function createOrgForExistingUser({
  userId,
  lairName,
  lairSlug,
  selectedTier = 'free'
}: {
  userId: string;
  lairName: string;
  lairSlug: string;
  selectedTier?: 'free' | 'starter' | 'pro';
}) {
  try {
    await initializeServices();
    const { request } = requestInfo;

    // Validate inputs
    if (!userId || !lairName || !lairSlug) {
      throw new Error('All fields are required');
    }

    // Validate slug format
    if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(lairSlug)) {
      throw new Error('Lair subdomain can only contain lowercase letters, numbers, and hyphens (not at start/end)');
    }

    if (lairSlug.length < 6) {
      throw new Error('Lair subdomain must be at least 6 characters');
    }

    console.log('🏰 Creating organization for existing user:', userId);

    // Check if slug is available
    const existingOrg = await db.organization.findUnique({
      where: { slug: lairSlug }
    });

    if (existingOrg) {
      throw new Error('Lair subdomain is already taken');
    }

    // Check if user already has an org
    const existingMembership = await db.member.findFirst({
      where: { userId }
    });

    if (existingMembership) {
      throw new Error('User already has an organization');
    }

    // Create organization
    const org = await db.organization.create({
      data: {
        id: crypto.randomUUID(),
        name: lairName,
        slug: lairSlug,
        metadata: JSON.stringify({ isPersonal: true }),
        createdAt: new Date()
      }
    });

    console.log('✅ Organization created:', org.id);

    // Add user as owner
    await db.member.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: org.id,
        userId: userId,
        role: 'owner',
        createdAt: new Date()
      }
    });

    console.log('✅ User added as owner to org');

    // Create subscription record
    await db.squeezeSubscription.create({
      data: {
        id: crypto.randomUUID(),
        userId: userId,
        tier: selectedTier,
        status: 'active',
      }
    });

    console.log('✅ Subscription created with tier:', selectedTier);

    // Get the appropriate redirect URL
    const redirectUrl = getRedirectUrl(lairSlug, request);
    console.log('🔗 Redirect URL:', redirectUrl);

    return {
      success: true,
      orgId: org.id,
      orgSlug: org.slug,
      redirectUrl
    };

  } catch (error) {
    console.error('❌ Error creating org for existing user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}