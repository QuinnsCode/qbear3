import { db } from "@/db";

export interface ShipStationCredentials {
  authString: string;
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
  
  return { authString: credential.encryptedAuth };
}

export async function setOrgShipStationCredentials(
  organizationId: string, 
  credentials: ShipStationCredentials,
  userId?: string
) {
  await db.apikey.upsert({
    where: { 
      id: `${organizationId}-shipstation-auth`
    },
    update: {
      key: credentials.authString,
      updatedAt: new Date()
    },
    create: {
      id: `${organizationId}-shipstation-auth`,
      organizationId,
      service: 'shipstation',
      keyType: 'basic_auth',
      name: 'ShipStation Basic Auth',
      key: credentials.authString,
      userId,
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