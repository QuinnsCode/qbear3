import { db } from "@/db";
import { decrypt, encrypt } from "@/app/components/ThirdPartyApiKeys/thirdPartyApiKeyFunctions";

export interface ShipStationCredentials {
  authString: string;
} 

export async function getOrgShipStationCredentialsFromOrgSlug(orgSlug: string): Promise<ShipStationCredentials> {
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true }
  });
  
  if (!organization) {
    throw new Error(`Organization not found: ${orgSlug}`);
  }
  
  return getOrgShipStationCredentials(organization.id);
}

export async function getOrgShipStationCredentials(organizationId: string): Promise<ShipStationCredentials> {
  const credential = await db.thirdPartyApiKey.findFirst({
    where: {
      organizationId,
      service: 'shipstation',
      enabled: true
    },
    orderBy: {
      updatedAt: 'desc'  // Most recently updated first
    }
  });
  
  if (!credential?.encryptedAuth) {
    throw new Error(`ShipStation credentials not configured for organization ${organizationId}`);
  }
  
  // Decrypt the stored credential using Web Crypto API
  const decryptedAuth = await decrypt(credential.encryptedAuth);
  
  return { authString: decryptedAuth };
}

export async function setOrgShipStationCredentials(
  organizationId: string, 
  credentials: ShipStationCredentials,
  userId?: string
) {
  // Encrypt the auth string before storing
  const encryptedAuth = await encrypt(credentials.authString);
  
  await db.thirdPartyApiKey.upsert({
    where: { 
      id: `${organizationId}-shipstation-auth`
    },
    update: {
      encryptedAuth: encryptedAuth, // Store encrypted version
      updatedAt: new Date()
    },
    create: {
      id: `${organizationId}-shipstation-auth`,
      organizationId,
      service: 'shipstation',
      authType: 'basic',
      name: 'ShipStation Basic Auth',
      encryptedAuth: encryptedAuth, // Store encrypted version
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
}

export async function checkOrgHasShipStationCredentials(organizationId: string): Promise<boolean> {
  try {
    await getOrgShipStationCredentials(organizationId);
    return true;
  } catch {
    return false;
  }
}