"use server";

import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";

export async function createApiKey(formData: FormData) {
  try {
    const { ctx } = requestInfo;
    
    if (!ctx.user || !ctx.organization) {
      throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const service = formData.get("service") as string;
    const keyType = formData.get("keyType") as string;
    const key = formData.get("key") as string;
    const enabled = formData.get("enabled") === "on";

    if (!name || !service || !keyType || !key) {
      throw new Error("Missing required fields");
    }

    // Generate masked version for display
    const start = key.length < 8 ? key.substring(0, 3) + "***" : key.substring(0, 3) + "***";

    await db.apikey.create({
      data: {
        id: crypto.randomUUID(),
        name,
        service,
        keyType,
        key,
        enabled,
        organizationId: ctx.organization.id,
        userId: ctx.user.id,
        start,
        prefix: service.substring(0, 3).toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating API key:', error);
    throw new Error("Failed to create API key. Please check your network connection and try again.");
  }
}

export async function deleteApiKey(formData: FormData) {
  const { ctx } = requestInfo;
  
  if (!ctx.user || !ctx.organization) {
    throw new Error("Unauthorized");
  }

  const keyId = formData.get("keyId") as string;

  // Verify the key belongs to this organization
  const existingKey = await db.apikey.findFirst({
    where: {
      id: keyId,
      organizationId: ctx.organization.id,
    },
  });

  if (!existingKey) {
    throw new Error("API key not found");
  }

  await db.apikey.delete({
    where: { id: keyId },
  });
}

export async function toggleApiKey(formData: FormData) {
  const { ctx } = requestInfo;
  
  if (!ctx.user || !ctx.organization) {
    throw new Error("Unauthorized");
  }

  const keyId = formData.get("keyId") as string;
  const enabled = formData.get("enabled") === "true";

  // Verify the key belongs to this organization
  const existingKey = await db.apikey.findFirst({
    where: {
      id: keyId,
      organizationId: ctx.organization.id,
    },
  });

  if (!existingKey) {
    throw new Error("API key not found");
  }

  await db.apikey.update({
    where: { id: keyId },
    data: { 
      enabled,
      updatedAt: new Date(),
    },
  });
}