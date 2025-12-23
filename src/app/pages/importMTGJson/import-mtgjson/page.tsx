// app/pages/admin/import-mtgjson/page.tsx
import { type RequestInfo } from "rwsdk/worker"
import { importMTGJSONCards, getLastImport } from '@/app/serverActions/cardGame/importMTGJSON'

export default async function ImportMTGJSONPage({ request }: RequestInfo) {
  const url = new URL(request.url)
  
  // Handle import trigger
  if (request.method === 'POST') {
    const formData = await request.formData()
    const action = formData.get('action')
    const limit = formData.get('limit')
    
    if (action === 'import') {
      const limitNum = limit ? parseInt(limit as string) : 0
      
      console.log(`🚀 Starting import with limit: ${limitNum || 'ALL'}`)
      
      const result = await importMTGJSONCards(limitNum)
      
      if (result.success) {
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': `/admin/import-mtgjson?success=true&added=${result.stats.added}&skipped=${result.stats.skipped}&tcg=${result.stats.cardsWithTCG}` 
          }
        })
      } else {
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': `/admin/import-mtgjson?error=${encodeURIComponent(result.error || 'Unknown error')}` 
          }
        })
      }
    }
  }
  
  // Get last import info
  const lastImport = await getLastImport()
  
  const success = url.searchParams.get('success')
  const added = url.searchParams.get('added')
  const skipped = url.searchParams.get('skipped')
  const tcg = url.searchParams.get('tcg')
  const error = url.searchParams.get('error')
  
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          🎴 MTGJSON Card Import
        </h1>
        
        {/* Success Message */}
        {success && (
          <div className="bg-green-600 text-white p-6 rounded-lg mb-6">
            <div className="text-2xl font-bold mb-2">✅ Import Successful!</div>
            <div className="space-y-1">
              <div>Added: {added} new cards</div>
              <div>Skipped: {skipped} (already cached)</div>
              <div>With TCGPlayer SKU: {tcg}</div>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-600 text-white p-4 rounded-lg mb-6">
            ❌ Error: {error}
          </div>
        )}
        
        {/* Last Import Info */}
        {lastImport && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Last Import</h2>
            <div className="space-y-2 text-gray-300">
              <div>
                <span className="text-gray-500">Date:</span>{' '}
                {new Date(lastImport.timestamp).toLocaleString()}
              </div>
              <div>
                <span className="text-gray-500">Added:</span> {lastImport.stats.added}
              </div>
              <div>
                <span className="text-gray-500">Skipped:</span> {lastImport.stats.skipped}
              </div>
              <div>
                <span className="text-gray-500">With TCGPlayer:</span> {lastImport.stats.cardsWithTCG}
              </div>
              <div>
                <span className="text-gray-500">Errors:</span> {lastImport.stats.errors}
              </div>
            </div>
          </div>
        )}
        
        {/* Import Options */}
        <div className="bg-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Import Cards</h2>
          
          <p className="text-gray-400 text-sm mb-4">
            Downloads cards from MTGJSON and adds them to your KV cache.
            Only adds cards that aren't already cached (won't overwrite Scryfall cards).
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Test Import */}
            <form method="POST" className="bg-slate-700 rounded-lg p-4">
              <input type="hidden" name="action" value="import" />
              <input type="hidden" name="limit" value="100" />
              <h3 className="text-white font-bold mb-2">🧪 Test Import</h3>
              <p className="text-gray-400 text-sm mb-4">
                Import first 100 cards to test
              </p>
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Import 100 Cards
              </button>
            </form>
            
            {/* Medium Import */}
            <form method="POST" className="bg-slate-700 rounded-lg p-4">
              <input type="hidden" name="action" value="import" />
              <input type="hidden" name="limit" value="1000" />
              <h3 className="text-white font-bold mb-2">📦 Medium Import</h3>
              <p className="text-gray-400 text-sm mb-4">
                Import 1,000 popular cards
              </p>
              <button 
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              >
                Import 1,000 Cards
              </button>
            </form>
            
            {/* Large Import */}
            <form method="POST" className="bg-slate-700 rounded-lg p-4">
              <input type="hidden" name="action" value="import" />
              <input type="hidden" name="limit" value="10000" />
              <h3 className="text-white font-bold mb-2">🚀 Large Import</h3>
              <p className="text-gray-400 text-sm mb-4">
                Import 10,000 cards (most played)
              </p>
              <button 
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
              >
                Import 10,000 Cards
              </button>
            </form>
            
            {/* Full Import */}
            <form method="POST" className="bg-slate-700 rounded-lg p-4">
              <input type="hidden" name="action" value="import" />
              <input type="hidden" name="limit" value="0" />
              <h3 className="text-white font-bold mb-2">💎 Full Import</h3>
              <p className="text-gray-400 text-sm mb-4">
                Import ALL ~25,000 cards
              </p>
              <button 
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Import All Cards
              </button>
            </form>
          </div>
          
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mt-4">
            <div className="text-yellow-400 font-bold mb-2">⚠️ Notes:</div>
            <ul className="text-yellow-300 text-sm space-y-1 list-disc list-inside">
              <li>Large imports may take 10-15 minutes</li>
              <li>Check server logs to see progress</li>
              <li>Safe to run multiple times (skips existing cards)</li>
              <li>Includes TCGPlayer SKUs for affiliate links</li>
            </ul>
          </div>
        </div>
        
        {/* What Gets Imported */}
        <div className="bg-slate-800 rounded-xl p-6 mt-6">
          <h2 className="text-xl font-bold text-white mb-4">What Gets Imported</h2>
          <div className="space-y-2 text-gray-300 text-sm">
            <div>✅ Card name, mana cost, type, oracle text</div>
            <div>✅ Power/toughness, loyalty</div>
            <div>✅ Colors, color identity, keywords</div>
            <div>✅ Legalities (Commander, Modern, etc.)</div>
            <div>✅ EDHREC rank</div>
            <div>✅ TCGPlayer SKU (for affiliate links!)</div>
            <div>❌ Images (loaded lazily from Scryfall)</div>
            <div>❌ Prices (added when Scryfall overwrites)</div>
          </div>
        </div>
      </div>
    </div>
  )
}