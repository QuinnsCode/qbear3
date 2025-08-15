///@/app/components/Game/gameData.ts
// Territory positions for visual layout - STRETCHED VERTICALLY with better water positioning
export const TERRITORY_POSITIONS: Record<string, { x: number; y: number }> = {
  // North America (top section - y: 80-200)
  '0': { x: 100, y: 80 },  // Northwestern Oil Emirate
  '1': { x: 160, y: 100 }, // Alberta
  '2': { x: 130, y: 220 }, // Mexico (moved down)
  '3': { x: 200, y: 160 }, // American Republic
  '4': { x: 250, y: 180 }, // Exiled States of America
  '5': { x: 150, y: 50 },  // Nunavut (moved up)
  '6': { x: 210, y: 80 },  // Canada
  '7': { x: 270, y: 110 }, // République du Québec
  '8': { x: 170, y: 260 }, // Continental Biospheres (moved down)
  
  // South America (middle-bottom section - y: 380-520)
  '9': { x: 220, y: 480 }, // Argentina (moved way down)
  '10': { x: 200, y: 400 }, // Amazon Desert (moved down)
  '11': { x: 170, y: 440 }, // Andean Nations (moved down)
  '12': { x: 160, y: 360 }, // Nuevo Timoto (moved down)
  
  // Europe (top-middle section - y: 60-220)
  '13': { x: 450, y: 100 }, // New Avalon
  '14': { x: 390, y: 60 },  // Iceland GRC
  '15': { x: 520, y: 140 }, // Warsaw Republic
  '16': { x: 480, y: 50 },  // Jotenheim (moved up)
  '17': { x: 550, y: 200 }, // Imperial Balkania (moved down)
  '18': { x: 600, y: 120 }, // Ukrayina
  '19': { x: 480, y: 180 }, // Andorra
  
  // Africa (middle-bottom section - y: 320-520, decompressed significantly)
  '20': { x: 550, y: 420 }, // Zaire Military Zone (moved way down)
  '21': { x: 600, y: 380 }, // Ministry of Djibouti (moved down)
  '22': { x: 570, y: 320 }, // Egypt (stays higher as northern Africa)
  '23': { x: 630, y: 460 }, // Madagascar (moved way down)
  '24': { x: 510, y: 350 }, // Saharan Empire (moved down)
  '25': { x: 560, y: 500 }, // Lesotho (moved way down)
  
  // Asia (top-middle section - y: 80-320, spread more)
  '26': { x: 680, y: 240 }, // Afghanistan
  '27': { x: 820, y: 280 }, // Hong Kong (moved down)
  '28': { x: 740, y: 320 }, // United Indiastan (moved down)
  '29': { x: 900, y: 260 }, // Alden (moved down)
  '30': { x: 950, y: 180 }, // Japan
  '31': { x: 860, y: 100 }, // Pevek (moved up)
  '32': { x: 650, y: 280 }, // Middle East (moved down)
  '33': { x: 780, y: 200 }, // Khan Industrial State
  '34': { x: 800, y: 350 }, // Angkhor Wat (moved way down)
  '35': { x: 750, y: 120 }, // Siberia
  '36': { x: 820, y: 100 }, // Enclave of the Bear
  '37': { x: 880, y: 120 }, // Sakha
  
  // Oceania (bottom section - y: 440-560, moved way down)
  '38': { x: 920, y: 480 }, // Australian Testing Ground (moved way down)
  '39': { x: 860, y: 440 }, // Java Cartel (moved way down)
  '40': { x: 980, y: 460 }, // New Guinea (moved way down)
  '41': { x: 900, y: 520 }, // Aboriginal League (moved way down)

  // ✅ WATER TERRITORIES - positioned equidistantly between connections, water-to-water prioritized
  
  // Pacific Chain (left side, north to south)
  '42': { x: 60, y: 320 },  // Poseidon (between Continental Biospheres 8 and Hawaiian Preserve 43)
  '43': { x: 60, y: 230 },  // Hawaiian Preserve (between Poseidon 42 and upper Pacific)
  '44': { x: 100, y: 380 }, // New Atlantis (between Poseidon 42 and Nuevo Timoto 12)

  // Asia Pacific Chain (far east, water-to-water spacing)
  '45': { x: 950, y: 400 }, // Sung Tzu (between Neo Tokyo 46 and Java Cartel 39)
  '46': { x: 950, y: 300 }, // Neo Tokyo (between Hong Kong 27 and Sung Tzu 45)

  // Atlantic Chain (center, north to south with water-to-water priority)
  '47': { x: 360, y: 410 }, // The Ivory Reef (between Saharan Empire 24 and Neo Paulo 48)
  '48': { x: 280, y: 430 }, // Neo Paulo (between Amazon Desert 10 and Ivory Reef 47)
  '49': { x: 240, y: 330 }, // Nova Brasilia (between New York 50 and Neo Paulo 48)
  '50': { x: 320, y: 240 }, // New York (between American Republic 3 and Nova Brasilia 49)
  '51': { x: 380, y: 150 }, // Western Ireland (between New Avalon 13 and New York 50)

  // Indian Ocean Chain (between Asia/Africa/Australia, water-to-water focus)
  '52': { x: 760, y: 380 }, // South Ceylon (between United Indiastan 28 and Microcorp 53)
  '53': { x: 720, y: 440 }, // Microcorp (between South Ceylon 52 and Akara 54)
  '54': { x: 840, y: 460 }  // Akara (between Microcorp 53 and Aboriginal League 41)
}