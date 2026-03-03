// src/app/components/VTT/FogOfWarRenderer.tsx

import * as THREE from 'three'
import type { FogState } from '@/app/services/vtt/VTTGameState'

/**
 * FogOfWarRenderer - Renders realistic volumetric fog of war
 *
 * Uses layered animated shader planes per chunk to simulate
 * thick atmospheric fog. GM sees through at low opacity;
 * players see near-opaque fog that hides unrevealed areas.
 */

// Vertex shader — standard passthrough with UV
const FOG_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Fragment shader — animated fractal noise fog
const FOG_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  uniform float time;
  uniform float opacity;
  uniform vec3 fogColor;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),               hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(1.7, 9.2);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.1 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Domain-warped fbm for convincing fog billows
    vec2 uv = vUv * 2.5 + vec2(time * 0.04, time * 0.025);
    float f = fbm(uv);
    f = fbm(uv + vec2(f * 1.4, f * 0.9));

    // Soft fade at chunk edges so adjacent chunks blend
    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edgeFade = smoothstep(0.0, 0.12, edge);

    // Density 0.55–1.0 so there are no hard gaps
    float density = mix(0.55, 1.0, f);

    gl_FragColor = vec4(fogColor, density * opacity * edgeFade);
  }
`

interface LayerConfig {
  y: number       // height above ground
  opacity: number // base opacity for this layer
  speed: number   // animation speed multiplier
}

// GM sees through fog — lighter layers only
const GM_LAYERS: LayerConfig[] = [
  { y: 0.15, opacity: 0.28, speed: 1.0 },
  { y: 2.5,  opacity: 0.16, speed: 1.4 },
  { y: 5.0,  opacity: 0.08, speed: 0.85 },
]

// Players are blocked — dense stacked layers
const PLAYER_LAYERS: LayerConfig[] = [
  { y: 0.15, opacity: 0.94, speed: 1.0 },
  { y: 2.5,  opacity: 0.72, speed: 1.4 },
  { y: 5.0,  opacity: 0.48, speed: 0.85 },
  { y: 7.5,  opacity: 0.24, speed: 1.2 },
]

// Dark near-black with slight cool blue for players (unknown territory)
const PLAYER_COLOR = new THREE.Color(0.05, 0.05, 0.12)
// Medium grey-blue for GM (can see through to edit)
const GM_COLOR = new THREE.Color(0.38, 0.44, 0.55)

const CHUNK_SIZE = 10

export class FogOfWarRenderer {
  private scene: THREE.Scene
  private isGM: boolean
  private fogGroup: THREE.Group
  private fogChunks: Map<string, THREE.Group> = new Map()
  private clock: THREE.Clock

  constructor(scene: THREE.Scene, isGM: boolean) {
    this.scene = scene
    this.isGM = isGM
    this.clock = new THREE.Clock()

    this.fogGroup = new THREE.Group()
    this.fogGroup.name = 'fogOfWar'
    this.scene.add(this.fogGroup)
  }

  /**
   * Sync fog chunks to server state
   */
  updateFog(fogState: FogState) {
    if (!fogState.enabled) {
      this.fogGroup.visible = false
      return
    }

    this.fogGroup.visible = true

    const minX = -5
    const maxX = 5
    const minZ = -5
    const maxZ = 5

    // Handle Set or array (client state comes from JSON deserialization)
    const revealed: Set<string> =
      fogState.revealedChunks instanceof Set
        ? fogState.revealedChunks
        : new Set(fogState.revealedChunks as unknown as string[])

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const key = `${x},${z}`
        if (revealed.has(key)) {
          this.removeChunk(key)
        } else if (!this.fogChunks.has(key)) {
          this.createChunk(x, z, key)
        }
      }
    }

    // Cull chunks that drifted out of bounds
    for (const key of this.fogChunks.keys()) {
      const [x, z] = key.split(',').map(Number)
      if (x < minX || x > maxX || z < minZ || z > maxZ) {
        this.removeChunk(key)
      }
    }
  }

  /**
   * Animate shader uniforms — call every frame from SceneManager.update()
   */
  update() {
    const elapsed = this.clock.getElapsedTime()

    for (const group of this.fogChunks.values()) {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.ShaderMaterial
          if (mat.uniforms?.time) {
            const speed: number = child.userData.animSpeed ?? 1.0
            const offset: number = child.userData.timeOffset ?? 0
            mat.uniforms.time.value = elapsed * speed + offset
          }
        }
      })
    }
  }

  /**
   * Build a multi-layer fog chunk group
   */
  private createChunk(chunkX: number, chunkZ: number, key: string) {
    const group = new THREE.Group()
    group.userData.chunkKey = key

    const worldX = chunkX * CHUNK_SIZE + CHUNK_SIZE / 2
    const worldZ = chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2
    group.position.set(worldX, 0, worldZ)

    const layers = this.isGM ? GM_LAYERS : PLAYER_LAYERS
    const color = this.isGM ? GM_COLOR : PLAYER_COLOR

    // Random time offset per chunk so they don't breathe in sync
    const chunkOffset = Math.random() * 100

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]
      const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE)
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          time:     { value: 0.0 },
          opacity:  { value: layer.opacity },
          fogColor: { value: color },
        },
        vertexShader: FOG_VERTEX_SHADER,
        fragmentShader: FOG_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })

      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.y = layer.y
      mesh.userData.animSpeed = layer.speed
      mesh.userData.timeOffset = chunkOffset + i * 13.7 // stagger per layer
      mesh.userData.baseOpacity = layer.opacity
      mesh.userData.layerIndex = i

      group.add(mesh)
    }

    // Subtle blue-grey chunk outline for GM — much less aggressive than red
    if (this.isGM) {
      const edgeGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE))
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x5577aa,
        transparent: true,
        opacity: 0.25,
      })
      const outline = new THREE.LineSegments(edgeGeo, edgeMat)
      outline.rotation.x = -Math.PI / 2
      outline.position.y = 0.1
      group.add(outline)
    }

    this.fogGroup.add(group)
    this.fogChunks.set(key, group)
  }

  /**
   * Dispose and remove a chunk group
   */
  private removeChunk(key: string) {
    const group = this.fogChunks.get(key)
    if (!group) return

    group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose())
        } else {
          (child.material as THREE.Material).dispose()
        }
      }
    })

    this.fogGroup.remove(group)
    this.fogChunks.delete(key)
  }

  /**
   * World position → chunk key (for GM paint tools)
   */
  getFogChunkAtPosition(x: number, z: number): string | null {
    const key = `${Math.floor(x / CHUNK_SIZE)},${Math.floor(z / CHUNK_SIZE)}`
    return this.fogChunks.has(key) ? key : null
  }

  /**
   * Hover highlight for GM chunk editing
   */
  highlightChunk(chunkKey: string | null) {
    if (!this.isGM) return

    for (const [key, group] of this.fogChunks.entries()) {
      const hovered = key === chunkKey
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.ShaderMaterial
          if (mat.uniforms?.opacity) {
            const base: number = child.userData.baseOpacity ?? 0.2
            mat.uniforms.opacity.value = hovered ? Math.min(base * 2.0, 0.85) : base
          }
        }
      })
    }
  }

  dispose() {
    for (const key of [...this.fogChunks.keys()]) {
      this.removeChunk(key)
    }
    this.scene.remove(this.fogGroup)
  }
}
