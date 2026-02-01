// app/lib/constants/regions.ts

export type Region = 'us-east' | 'us-west' | 'europe' | 'asia' | 'south-america';

export interface RegionConfig {
  id: Region;
  name: string;
  flag: string;
  hint: 'enam' | 'wnam' | 'weur' | 'apac' | 'sam';
  description: string;
}

export const REGIONS: Record<Region, RegionConfig> = {
  'us-east': {
    id: 'us-east',
    name: 'US East',
    flag: '🇺🇸',
    hint: 'enam',
    description: 'Eastern United States'
  },
  'us-west': {
    id: 'us-west',
    name: 'US West',
    flag: '🇺🇸',
    hint: 'wnam',
    description: 'Western United States'
  },
  'europe': {
    id: 'europe',
    name: 'Europe',
    flag: '🇪🇺',
    hint: 'weur',
    description: 'European Union'
  },
  'asia': {
    id: 'asia',
    name: 'Asia',
    flag: '🌏',
    hint: 'apac',
    description: 'Asia Pacific'
  },
  'south-america': {
    id: 'south-america',
    name: 'South America',
    flag: '🌎',
    hint: 'sam',
    description: 'South America'
  }
};

export const REGION_LIST = Object.values(REGIONS);

export function getRegionConfig(region: string): RegionConfig | null {
  return REGIONS[region as Region] || null;
}

export const PVP_DECK_EXPIRY_HOURS = 4;
export const PVP_DECK_EXPIRY_MS = PVP_DECK_EXPIRY_HOURS * 60 * 60 * 1000;
