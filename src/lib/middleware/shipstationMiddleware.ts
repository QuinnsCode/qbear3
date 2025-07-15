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
  await db.thirdPartyApiKey.upsert({
    where: { 
      id: `${organizationId}-shipstation-auth`
    },
    update: {
      encryptedAuth: credentials.authString,
      updatedAt: new Date()
    },
    create: {
      id: `${organizationId}-shipstation-auth`,
      organizationId,
      service: 'shipstation',
      authType: 'basic',
      name: 'ShipStation Basic Auth',
      encryptedAuth: credentials.authString,
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