// lib/auth/autoCreateOrgForOAuthUser.ts
import { db } from "@/db";

/**
 * Automatically creates an organization for OAuth users on first sign-in.
 * This ensures every user has a personal lair/subdomain, matching the behavior
 * of email/password signup.
 */
export async function autoCreateOrgForOAuthUser(
  user: { id: string; email: string; name: string | null }
): Promise<void> {
  try {
    // Check if user already has an org (shouldn't happen for new users, but safety check)
    const existingMembership = await db.member.findFirst({
      where: { userId: user.id }
    });

    if (existingMembership) {
      console.log('✅ User already has org, skipping auto-create');
      return;
    }

    console.log('🏰 Auto-creating organization for OAuth user:', user.email);

    // Generate a slug from email (before @)
    const emailPrefix = user.email.split('@')[0];
    let baseSlug = emailPrefix
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20); // Limit length

    // Ensure minimum length
    if (baseSlug.length < 3) {
      baseSlug = `user-${baseSlug}`;
    }

    // Ensure slug is unique
    let slug = baseSlug;
    let counter = 1;
    let slugExists = await db.organization.findUnique({ where: { slug } });

    while (slugExists) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      slugExists = await db.organization.findUnique({ where: { slug } });
    }

    // Create organization
    const org = await db.organization.create({
      data: {
        id: crypto.randomUUID(),
        name: `${user.name || user.email.split('@')[0]}'s Lair`,
        slug: slug,
        metadata: JSON.stringify({
          isPersonal: true,
          createdViaOAuth: true,
          createdAt: new Date().toISOString()
        }),
        createdAt: new Date()
      }
    });

    console.log('✅ Organization created:', org.id, 'with slug:', slug);

    // Add user as owner
    await db.member.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        organizationId: org.id,
        role: 'owner',
        createdAt: new Date()
      }
    });

    console.log('✅ User added as owner to auto-created org');
  } catch (error) {
    console.error('❌ Failed to auto-create org for OAuth user:', error);
    // Don't throw - let the user sign in, they'll be redirected to create-lair by middleware
  }
}
