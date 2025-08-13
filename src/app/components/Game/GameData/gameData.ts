///@/app/components/Game/gameData.ts
// Territory positions for visual layout - COMPLETE with water territories
export const TERRITORY_POSITIONS: Record<string, { x: number; y: number }> = {
  // North America (spread out more)
  '0': { x: 100, y: 100 }, // Northwestern Oil Emirate
  '1': { x: 160, y: 120 }, // Alberta
  '2': { x: 130, y: 190 }, // Mexico
  '3': { x: 200, y: 160 }, // American Republic
  '4': { x: 250, y: 170 }, // Exiled States of America
  '5': { x: 150, y: 70 },  // Nunavut
  '6': { x: 210, y: 100 }, // Canada
  '7': { x: 270, y: 130 }, // République du Québec
  '8': { x: 170, y: 220 }, // Continental Biospheres
  
  // South America
  '9': { x: 220, y: 380 }, // Argentina
  '10': { x: 200, y: 320 }, // Amazon Desert
  '11': { x: 170, y: 350 }, // Andean Nations
  '12': { x: 160, y: 300 }, // Nuevo Timoto
  
  // Europe (spread out more)
  '13': { x: 450, y: 100 }, // New Avalon
  '14': { x: 390, y: 70 },  // Iceland GRC
  '15': { x: 520, y: 120 }, // Warsaw Republic
  '16': { x: 480, y: 60 },  // Jotenheim
  '17': { x: 550, y: 190 }, // Imperial Balkania
  '18': { x: 600, y: 120 }, // Ukrayina
  '19': { x: 480, y: 170 }, // Andorra
  
  // Africa (moved down significantly to decompress middle)
  '20': { x: 550, y: 340 }, // Zaire Military Zone
  '21': { x: 600, y: 320 }, // Ministry of Djibouti
  '22': { x: 570, y: 280 }, // Egypt
  '23': { x: 630, y: 370 }, // Madagascar
  '24': { x: 510, y: 300 }, // Saharan Empire
  '25': { x: 560, y: 400 }, // Lesotho
  
  // Asia (spread out more, especially rightward)
  '26': { x: 680, y: 200 }, // Afghanistan
  '27': { x: 820, y: 240 }, // Hong Kong
  '28': { x: 740, y: 280 }, // United Indiastan
  '29': { x: 900, y: 220 }, // Alden
  '30': { x: 950, y: 170 }, // Japan
  '31': { x: 860, y: 120 }, // Pevek
  '32': { x: 650, y: 240 }, // Middle East
  '33': { x: 780, y: 180 }, // Khan Industrial State
  '34': { x: 800, y: 300 }, // Angkhor Wat
  '35': { x: 750, y: 140 }, // Siberia
  '36': { x: 820, y: 120 }, // Enclave of the Bear
  '37': { x: 880, y: 140 }, // Sakha
  
  // Oceania (moved further right)
  '38': { x: 920, y: 400 }, // Australian Testing Ground
  '39': { x: 860, y: 360 }, // Java Cartel
  '40': { x: 980, y: 380 }, // New Guinea
  '41': { x: 900, y: 440 }, // Aboriginal League

  // ✅ WATER TERRITORIES - positioned between their connections
  // US Pacific (connecting Continental Biospheres 8 to Hawaiian Preserve 43)
  '42': { x: 60, y: 270 },  // Poseidon (between US land and Hawaii)
  '43': { x: 60, y: 200 },   // Hawaiian Preserve (Pacific)
  '44': { x: 100, y: 310 },  // New Atlantis (connects to Nuevo Timoto 12)

  // Asia Pacific (EAST of Asia as requested!)
  '45': { x: 950, y: 340 }, // Sung Tzu (between Java 39 and Neo Tokyo 46)
  '46': { x: 950, y: 240 }, // Neo Tokyo (east of Japan 30, connects to Hong Kong 27)

  // Southern Atlantic (between Africa and South America)
  '47': { x: 360, y: 340 }, // The Ivory Reef (between Saharan Empire 24 and Neo Paulo 48)
  '48': { x: 280, y: 360 }, // Neo Paulo (between Amazon Desert 10 and Ivory Reef 47)

  // Northern Atlantic (between Americas and Europe)
  '49': { x: 240, y: 270 }, // Nova Brasilia (connects to Amazon Desert 10)
  '50': { x: 320, y: 180 }, // New York (between American Republic 3 and Nova Brasilia 49)
  '51': { x: 380, y: 120 }, // Western Ireland (between New Avalon 13 and New York 50)

  // Indian Ocean (between Asia and Australia, near Madagascar)
  '52': { x: 760, y: 320 }, // South Ceylon (near United Indiastan 28)
  '53': { x: 720, y: 360 }, // Microcorp (between South Ceylon 52 and Madagascar 23)
  '54': { x: 840, y: 380 }  // Akara (between Aboriginal League 41 and Microcorp 53)
}