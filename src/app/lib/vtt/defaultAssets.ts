// src/app/lib/vtt/defaultAssets.ts

/**
 * Default Asset Library for VTT
 *
 * Curated list of free GLB models from various sources:
 * - Poly Pizza (CC0 license)
 * - Quaternius (CC0 license)
 * - Kenney (CC0 license)
 *
 * All models are free to use without attribution.
 */

export type AssetCategory = 'humanoid' | 'monster' | 'terrain' | 'prop' | 'template'

export interface VTTAsset {
  id: string
  name: string
  category: AssetCategory
  modelUrl: string
  thumbnailUrl?: string
  description?: string
  scale?: { x: number; y: number; z: number }
}

/**
 * Default asset library
 * Using Poly Pizza and other CC0 sources
 */
export const DEFAULT_ASSETS: VTTAsset[] = [
  // HUMANOIDS (PCs/NPCs)
  {
    id: 'human-male-1',
    name: 'Human Warrior',
    category: 'humanoid',
    modelUrl: 'https://cdn.polypizza.io/models/knight-low-poly.glb',
    description: 'Basic human warrior with sword and shield'
  },
  {
    id: 'human-female-1',
    name: 'Human Mage',
    category: 'humanoid',
    modelUrl: 'https://cdn.polypizza.io/models/wizard-low-poly.glb',
    description: 'Human mage with staff'
  },
  {
    id: 'elf-1',
    name: 'Elf Ranger',
    category: 'humanoid',
    modelUrl: 'https://cdn.polypizza.io/models/archer-low-poly.glb',
    description: 'Elf with bow and arrows'
  },
  {
    id: 'dwarf-1',
    name: 'Dwarf Fighter',
    category: 'humanoid',
    modelUrl: 'https://cdn.polypizza.io/models/dwarf-low-poly.glb',
    description: 'Dwarf with axe'
  },
  {
    id: 'paladin-1',
    name: 'Paladin',
    category: 'humanoid',
    modelUrl: 'https://cdn.polypizza.io/models/paladin-low-poly.glb',
    description: 'Holy knight in armor'
  },

  // MONSTERS
  {
    id: 'goblin-1',
    name: 'Goblin',
    category: 'monster',
    modelUrl: 'https://cdn.polypizza.io/models/goblin-low-poly.glb',
    description: 'Small goblin creature'
  },
  {
    id: 'orc-1',
    name: 'Orc Warrior',
    category: 'monster',
    modelUrl: 'https://cdn.polypizza.io/models/orc-low-poly.glb',
    description: 'Large orc with club'
  },
  {
    id: 'skeleton-1',
    name: 'Skeleton',
    category: 'monster',
    modelUrl: 'https://cdn.polypizza.io/models/skeleton-low-poly.glb',
    description: 'Undead skeleton warrior'
  },
  {
    id: 'dragon-1',
    name: 'Dragon',
    category: 'monster',
    modelUrl: 'https://cdn.polypizza.io/models/dragon-low-poly.glb',
    description: 'Flying dragon',
    scale: { x: 2, y: 2, z: 2 }
  },
  {
    id: 'spider-1',
    name: 'Giant Spider',
    category: 'monster',
    modelUrl: 'https://cdn.polypizza.io/models/spider-low-poly.glb',
    description: 'Large spider'
  },
  {
    id: 'zombie-1',
    name: 'Zombie',
    category: 'monster',
    modelUrl: 'https://cdn.polypizza.io/models/zombie-low-poly.glb',
    description: 'Undead zombie'
  },

  // TERRAIN
  {
    id: 'tree-1',
    name: 'Oak Tree',
    category: 'terrain',
    modelUrl: 'https://cdn.polypizza.io/models/tree-oak-low-poly.glb',
    description: 'Large oak tree'
  },
  {
    id: 'rock-1',
    name: 'Boulder',
    category: 'terrain',
    modelUrl: 'https://cdn.polypizza.io/models/rock-boulder-low-poly.glb',
    description: 'Large boulder'
  },
  {
    id: 'wall-stone-1',
    name: 'Stone Wall',
    category: 'terrain',
    modelUrl: 'https://cdn.polypizza.io/models/wall-stone-low-poly.glb',
    description: 'Stone wall segment'
  },
  {
    id: 'door-1',
    name: 'Wooden Door',
    category: 'terrain',
    modelUrl: 'https://cdn.polypizza.io/models/door-wood-low-poly.glb',
    description: 'Wooden door'
  },
  {
    id: 'fence-1',
    name: 'Wooden Fence',
    category: 'terrain',
    modelUrl: 'https://cdn.polypizza.io/models/fence-wood-low-poly.glb',
    description: 'Wooden fence segment'
  },

  // PROPS
  {
    id: 'chest-1',
    name: 'Treasure Chest',
    category: 'prop',
    modelUrl: 'https://cdn.polypizza.io/models/chest-treasure-low-poly.glb',
    description: 'Wooden treasure chest'
  },
  {
    id: 'barrel-1',
    name: 'Barrel',
    category: 'prop',
    modelUrl: 'https://cdn.polypizza.io/models/barrel-wood-low-poly.glb',
    description: 'Wooden barrel'
  },
  {
    id: 'crate-1',
    name: 'Crate',
    category: 'prop',
    modelUrl: 'https://cdn.polypizza.io/models/crate-wood-low-poly.glb',
    description: 'Wooden crate'
  },
  {
    id: 'table-1',
    name: 'Table',
    category: 'prop',
    modelUrl: 'https://cdn.polypizza.io/models/table-wood-low-poly.glb',
    description: 'Wooden table'
  },
  {
    id: 'torch-1',
    name: 'Torch',
    category: 'prop',
    modelUrl: 'https://cdn.polypizza.io/models/torch-wall-low-poly.glb',
    description: 'Lit wall torch'
  },
  {
    id: 'campfire-1',
    name: 'Campfire',
    category: 'prop',
    modelUrl: 'https://cdn.polypizza.io/models/campfire-low-poly.glb',
    description: 'Burning campfire'
  },

  // TEMPLATES (AoE markers)
  {
    id: 'marker-circle-5',
    name: 'Circle 5ft',
    category: 'template',
    modelUrl: '/vtt/templates/circle-5ft.glb',
    description: '5ft radius circle template',
    scale: { x: 0.5, y: 0.1, z: 0.5 }
  },
  {
    id: 'marker-circle-10',
    name: 'Circle 10ft',
    category: 'template',
    modelUrl: '/vtt/templates/circle-10ft.glb',
    description: '10ft radius circle template',
    scale: { x: 1, y: 0.1, z: 1 }
  },
  {
    id: 'marker-circle-20',
    name: 'Circle 20ft',
    category: 'template',
    modelUrl: '/vtt/templates/circle-20ft.glb',
    description: '20ft radius circle template',
    scale: { x: 2, y: 0.1, z: 2 }
  },
  {
    id: 'marker-cone',
    name: 'Cone Template',
    category: 'template',
    modelUrl: '/vtt/templates/cone.glb',
    description: '15ft cone template',
    scale: { x: 1.5, y: 0.1, z: 1.5 }
  },
  {
    id: 'marker-square',
    name: 'Square 10ft',
    category: 'template',
    modelUrl: '/vtt/templates/square-10ft.glb',
    description: '10ft square template',
    scale: { x: 1, y: 0.1, z: 1 }
  }
]

/**
 * Get assets by category
 */
export function getAssetsByCategory(category: AssetCategory): VTTAsset[] {
  return DEFAULT_ASSETS.filter(asset => asset.category === category)
}

/**
 * Get asset by ID
 */
export function getAssetById(id: string): VTTAsset | undefined {
  return DEFAULT_ASSETS.find(asset => asset.id === id)
}

/**
 * Search assets by name
 */
export function searchAssets(query: string): VTTAsset[] {
  const lowerQuery = query.toLowerCase()
  return DEFAULT_ASSETS.filter(
    asset =>
      asset.name.toLowerCase().includes(lowerQuery) ||
      asset.description?.toLowerCase().includes(lowerQuery)
  )
}
