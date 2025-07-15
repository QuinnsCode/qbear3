// @/lib/middleware/asanaMiddleware.ts
import { db } from "@/db";
import { decrypt } from "@/app/components/ThirdPartyApiKeys/thirdPartyApiKeyFunctions";

export interface AsanaCredentials {
  authString: string;
}

export async function getOrgAsanaCredentials(organizationId: string): Promise<AsanaCredentials> {
  console.log('🔍 Getting Asana credentials for org:', organizationId);
  
  const credential = await db.thirdPartyApiKey.findFirst({
    where: {
      organizationId,
      service: 'asana',
      authType: 'bearer',
      enabled: true
    }
  });
  
  if (!credential?.encryptedAuth) {
    console.log('⚠️ No Asana credentials found for org:', organizationId);
    throw new Error(`Asana credentials not configured for organization ${organizationId}`);
  }
  
  console.log('✅ Found Asana credentials for org:', organizationId);
  
  // Decrypt the auth string
  const authString = decrypt(credential.encryptedAuth);
  
  return { authString };
}

export async function setOrgAsanaCredentials(
  organizationId: string, 
  credentials: AsanaCredentials,
  userId?: string
) {
  const { encrypt } = await import("@/app/components/ThirdPartyApiKeys/thirdPartyApiKeyFunctions");
  
  const encryptedAuth = encrypt(credentials.authString);
  
  // First, try to find existing Asana credentials for this org
  const existing = await db.thirdPartyApiKey.findFirst({
    where: {
      organizationId,
      service: 'asana',
      authType: 'bearer'
    }
  });
  
  if (existing) {
    // Update existing
    await db.thirdPartyApiKey.update({
      where: { id: existing.id },
      data: {
        encryptedAuth,
        lastUsed: new Date(),
        enabled: true
      }
    });
  } else {
    // Create new
    await db.thirdPartyApiKey.create({
      data: {
        organizationId,
        service: 'asana',
        authType: 'bearer',
        name: 'Asana Bearer Token',
        encryptedAuth,
        enabled: true,
      }
    });
  }
}

export async function checkOrgHasAsanaCredentials(organizationId: string): Promise<boolean> {
  try {
    await getOrgAsanaCredentials(organizationId);
    return true;
  } catch {
    return false;
  }
}