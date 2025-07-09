"use server";
import { env } from "cloudflare:workers";
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { db } from '@/db';

const ENCRYPTION_KEY = env.API_ENCRYPTION_KEY!; // 32 bytes hex
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export async function createThirdPartyApiKey(formData: FormData) {
  const name = formData.get('name') as string;
  const service = formData.get('service') as string;
  const authType = formData.get('authType') as string;
  const authString = formData.get('authString') as string; // Full auth string
  const enabled = formData.get('enabled') === 'on';
  
  // Get current org from session/context
  const organizationId = 'current-org-id'; // TODO: Get from session
  
  try {
    const encryptedAuth = encrypt(authString);
    
    await db.thirdPartyApiKey.create({
      data: {
        organizationId,
        name,
        service,
        authType,
        encryptedAuth,
        enabled,
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to create third-party API key:', error);
    throw new Error('Failed to create API key');
  }
}

export async function getDecryptedAuth(keyId: string): Promise<string> {
  const apiKey = await db.thirdPartyApiKey.findUnique({
    where: { id: keyId }
  });
  
  if (!apiKey || !apiKey.enabled) {
    throw new Error('API key not found or disabled');
  }
  
  // Update last used
  await db.thirdPartyApiKey.update({
    where: { id: keyId },
    data: { lastUsed: new Date() }
  });
  
  return decrypt(apiKey.encryptedAuth);
}

export async function listThirdPartyApiKeys(organizationId: string) {
  return await db.thirdPartyApiKey.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      service: true,
      authType: true,
      enabled: true,
      lastUsed: true,
      createdAt: true,
      // Don't select encryptedAuth for security
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function deleteThirdPartyApiKey(keyId: string) {
  try {
    await db.thirdPartyApiKey.delete({
      where: { id: keyId }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete API key:', error);
    throw new Error('Failed to delete API key');
  }
}

export async function toggleThirdPartyApiKey(keyId: string, enabled: boolean) {
  try {
    await db.thirdPartyApiKey.update({
      where: { id: keyId },
      data: { enabled }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle API key:', error);
    throw new Error('Failed to update API key');
  }
}