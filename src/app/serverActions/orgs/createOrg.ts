// @/app/serverActions/orgs/createOrg.ts
"use server";

import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";

export async function createOrganization(formData: FormData) {
  const { ctx } = requestInfo;
  
  if (!ctx.user) {
    throw new Error('Unauthorized');
  }

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;

  // Validate inputs
  if (!name || !slug) {
    throw new Error('Name and slug are required');
  }

  // Check if slug is taken
  const existing = await db.organization.findUnique({
    where: { slug }
  });

  if (existing) {
    throw new Error('Organization slug already taken');
  }

  // Create org
  const org = await db.organization.create({
    data: {
      id: crypto.randomUUID(),
      name,
      slug,
      createdAt: new Date()
    }
  });

  // Add user as admin
  await db.member.create({
    data: {
      id: crypto.randomUUID(),
      userId: ctx.user.id,
      organizationId: org.id,
      role: 'admin',
      createdAt: new Date()
    }
  });

  // For redirect, we might need to use a different approach
  // Or handle it client-side after the action completes
}