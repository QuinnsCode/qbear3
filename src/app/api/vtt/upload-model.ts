// src/app/api/vtt/upload-model.ts

import type { RequestInfo } from 'rwsdk/worker'

/**
 * VTT Model Upload Endpoint
 *
 * POST /api/vtt/upload-model
 * - Accepts GLB file upload (multipart/form-data)
 * - Validates file size (<5MB)
 * - Validates file format (GLB magic bytes)
 * - Stores in R2 with content-hash filename
 * - Returns CDN URL for the uploaded model
 *
 * Authentication: Requires logged-in user
 * Authorization: GM only (optional - can be added later)
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const GLB_MAGIC_NUMBER = 0x46546C67 // "glTF" in little-endian

export default async function uploadModel({ ctx, request, env }: RequestInfo) {
  // Check authentication
  if (!ctx.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Only accept POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('model') as File | null

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Validate GLB magic number (first 4 bytes should be "glTF")
    const magicNumber = new DataView(arrayBuffer).getUint32(0, true)
    if (magicNumber !== GLB_MAGIC_NUMBER) {
      return new Response(JSON.stringify({ error: 'Invalid GLB file format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Generate content hash for filename (using simple hash for now)
    const hash = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hash))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const filename = `${hashHex}.glb`

    // Store in R2
    const key = `models/${ctx.user.id}/${filename}`
    await env.VTT_ASSETS.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: 'model/gltf-binary'
      },
      customMetadata: {
        uploadedBy: ctx.user.id,
        uploadedAt: new Date().toISOString(),
        originalFilename: file.name
      }
    })

    // Return URL (for dev, use direct R2 URL; in production, use CDN)
    const url = `/api/vtt/assets/${key}`

    return new Response(
      JSON.stringify({
        success: true,
        url,
        filename,
        size: file.size
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('[upload-model] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to upload model' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
