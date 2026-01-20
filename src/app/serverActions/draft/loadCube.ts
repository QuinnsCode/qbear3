// app/serverActions/draft/loadCube.ts
'use server'

import { VINTAGE_CUBE } from '@/app/data/vintageCubeData'
import type { CubeCard } from '@/app/types/Draft'

export async function loadVintageCube(): Promise<CubeCard[]> {
  console.log('✅ Returning pre-parsed cube:', VINTAGE_CUBE.length, 'cards')
  return VINTAGE_CUBE
}