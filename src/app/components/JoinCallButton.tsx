// app/components/JoinCallButton.tsx
'use client'

import { useState } from 'react'
import { Video } from 'lucide-react'

/** Opens the table's qlave video room in a new tab. Floats over the page so the table layout is untouched. */
export default function JoinCallButton({ kind, id }: { kind: 'cardGame' | 'draft'; id: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const join = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/call/${kind}/${encodeURIComponent(id)}`, { method: 'POST' })
      const body: unknown = await res.json().catch(() => undefined)
      const url = typeof body === 'object' && body !== null && 'url' in body && typeof body.url === 'string' ? body.url : undefined
      if (res.ok && url) window.open(url, '_blank', 'noopener')
      else setError(typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : 'Could not start the call')
    } catch {
      setError('Could not start the call')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed bottom-3 left-3 z-40 flex flex-col items-start gap-1">
      <button
        onClick={join}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-emerald-500 disabled:opacity-60"
      >
        <Video size={16} /> {busy ? 'Opening…' : 'Join call'}
      </button>
      {error && <span className="rounded bg-black/80 px-2 py-1 text-xs text-red-300">{error}</span>}
    </div>
  )
}
