//@/app/components/ThirdPartyApiKeys/thirdPartyApiKeyFunctions.ts
"use server";
import { env } from "cloudflare:workers";
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { db } from '@/db';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const ENCRYPTION_KEY = env.API_ENCRYPTION_KEY;
  
  if (!ENCRYPTION_KEY) {
    throw new Error('API_ENCRYPTION_KEY environment variable is not set');
  }
  
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string): string {
  const ENCRYPTION_KEY = env.API_ENCRYPTION_KEY;
  
  if (!ENCRYPTION_KEY) {
    throw new Error('API_ENCRYPTION_KEY environment variable is not set');
  }
  
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
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
  try {
    // Extract all form data including organization ID
    const name = formData.get('name') as string;
    const service = formData.get('service') as string;
    const authType = formData.get('authType') as string;
    const authString = formData.get('authString') as string;
    const enabled = formData.get('enabled') === 'on';
    const organizationId = formData.get('organizationId') as string;
    
    // Basic validation
    if (!name || !service || !authType || !authString) {
      return { 
        success: false, 
        error: 'Missing required fields' 
      };
    }
    
    if (!organizationId) {
      return { 
        success: false, 
        error: 'Organization ID is required' 
      };
    }
    
    console.log('Creating API key with data:', {
      name,
      service,
      authType,
      enabled,
      organizationId
    });
    
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
    
    console.log('API key created successfully');
    return { success: true };
    
  } catch (error) {
    console.error('Failed to create third-party API key:', error);
    
    // Return error details for debugging
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Rest of your functions remain the same...
export async function getDecryptedAuth(keyId: string): Promise<string> {
  try {
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
  } catch (error) {
    console.error('Failed to get decrypted auth:', error);
    throw error;
  }
}

export async function listThirdPartyApiKeys(organizationId: string) {
  try {
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
  } catch (error) {
    console.error('Failed to list API keys:', error);
    throw error;
  }
}

export async function deleteThirdPartyApiKey(keyId: string) {
  try {
    await db.thirdPartyApiKey.delete({
      where: { id: keyId }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
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
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}