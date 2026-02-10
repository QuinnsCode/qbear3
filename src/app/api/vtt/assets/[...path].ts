// src/app/api/vtt/assets/[...path].ts

import type { RequestInfo } from 'rwsdk/worker'

/**
 * VTT Asset Retrieval Endpoint
 *
 * GET /api/vtt/assets/models/{userId}/{filename}
 * - Retrieves GLB models from R2
 * - Returns model file with correct content-type
 * - Public access (no auth required for viewing)
 */

export default async function getAsset({ params, env }: RequestInfo) {
  const path = params?.path

  if (!path) {
    return new Response('Not found', { status: 404 })
  }

  try {
    // Get object from R2
    const object = await env.VTT_ASSETS.get(path)

    if (!object) {
      return new Response('Asset not found', { status: 404 })
    }

    // Return the file with correct headers
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'model/gltf-binary',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error) {
    console.error('[get-asset] Error:', error)
    return new Response('Failed to retrieve asset', { status: 500 })
  }
}
