import { env } from "cloudflare:workers";

const ENCRYPTION_KEY_HEX = env.API_ENCRYPTION_KEY! // 32 bytes hex

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyBuffer = new Uint8Array(
    ENCRYPTION_KEY_HEX.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  )
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(text: string): Promise<string> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM
  const encoded = new TextEncoder().encode(text)
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  
  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  
  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(encryptedData: string): Promise<string> {
  const key = await getEncryptionKey()
  
  // Decode from base64
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(char => char.charCodeAt(0))
  )
  
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  )
  
  return new TextDecoder().decode(decrypted)
}