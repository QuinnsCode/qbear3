// app/components/Draft/NewDraftForm.tsx
'use client'

import React, { useState } from 'react'
import { Bot, ChevronDown, Info, Layers, LogIn, Minus, Plus, Sparkles, UserPlus, Users, RotateCw } from 'lucide-react'
import { DEFAULT_DRAFT_CONFIG } from '@/app/types/Draft'
import { createDraft } from '@/app/serverActions/draft/createDraft'

interface Props {
  userId?: string
  userName?: string
  isGuest?: boolean
  previewCards?: { name: string; imageUrl: string }[]
  cubeSize?: number
}

export default function NewDraftForm({ userId, userName, isGuest, previewCards = [], cubeSize = 540 }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)

  const [config, setConfig] = useState({
    packSize: DEFAULT_DRAFT_CONFIG.packSize,
    packsPerPlayer: DEFAULT_DRAFT_CONFIG.packsPerPlayer,
    pickCount: DEFAULT_DRAFT_CONFIG.pickCount,
    aiCount: DEFAULT_DRAFT_CONFIG.playerCount
  })

  const totalPlayers = config.aiCount + 1
  const totalPicks = config.packSize * config.packsPerPlayer

  const handleStart = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await createDraft({
        config,
        aiCount: config.aiCount,
        userId,
        userName
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      // Set cookie BEFORE redirecting (for guests)
      if (isGuest && result.userId && result.draftId) {
        const cookieName = `draft_user_${result.draftId}`
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 7)
        document.cookie = `${cookieName}=${result.userId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      window.location.href = `/draft/${result.draftId}`
    } catch (err: any) {
      setError(err.message || 'Failed to start draft')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl backdrop-blur">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative grid gap-8 p-6 md:grid-cols-[1.1fr_1fr] md:p-10">
          <div className="flex flex-col justify-center">
            <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-300 ring-1 ring-amber-400/30">
              <Sparkles className="h-3.5 w-3.5" /> MTGO Vintage Cube
            </span>
            <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
              Draft the most powerful cube in Magic.
            </h1>
            <p className="mt-3 max-w-md text-slate-400">
              Crack {config.packsPerPlayer} packs against AI drafters, build a 40-card deck, and take it into a game.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <Stat label="Cards in cube" value={cubeSize} />
              <Stat label="Drafters" value={totalPlayers} />
              <Stat label="Your picks" value={totalPicks} />
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleStart}
              disabled={loading}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-4 text-lg font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (<><RotateCw className="h-5 w-5 animate-spin" /> Shuffling packs…</>) : (<><Layers className="h-5 w-5" /> Start draft</>)}
            </button>

            <button
              type="button"
              onClick={() => setShowConfig(v => !v)}
              className="mt-3 inline-flex w-fit items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
              aria-expanded={showConfig}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
              {showConfig ? 'Hide options' : 'Customize packs & opponents'}
            </button>
          </div>

          {/* Card fan */}
          <div className="relative hidden min-h-[320px] items-center justify-center md:flex">
            <div className="relative h-[300px] w-[220px]">
              {previewCards.map((card, i) => {
                const n = previewCards.length
                const mid = (n - 1) / 2
                const offset = i - mid
                const rot = offset * 11
                const x = offset * 42
                const y = Math.abs(offset) * 10
                return (
                  <div
                    key={card.imageUrl}
                    className="absolute left-1/2 top-1/2 w-[190px]"
                    style={{
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rot}deg)`,
                      zIndex: i,
                    }}
                  >
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      title={card.name}
                      loading="eager"
                      className="draft-card-in block w-full rounded-[10px] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.9)] ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-6"
                      style={{ animationDelay: `${i * 90}ms` }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Options */}
        {showConfig && (
          <div className="relative border-t border-white/5 bg-black/20 p-6 md:p-8">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Stepper
                label="Pack size"
                hint="cards per pack"
                value={config.packSize}
                min={8}
                max={20}
                onChange={v => setConfig({ ...config, packSize: v })}
              />
              <Stepper
                label="Packs"
                hint="per drafter"
                value={config.packsPerPlayer}
                min={2}
                max={5}
                onChange={v => setConfig({ ...config, packsPerPlayer: v })}
              />
              <div>
                <Label>Cards per pick</Label>
                <div className="flex rounded-xl bg-slate-900/80 p-1 ring-1 ring-white/5">
                  {[1, 2].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setConfig({ ...config, pickCount: n })}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                        config.pickCount === n ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {n} card{n > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">Two-card picks keep drafts fast.</p>
              </div>
              <div>
                <Stepper
                  label="AI opponents"
                  hint={`${totalPlayers} at the table`}
                  value={config.aiCount}
                  min={1}
                  max={7}
                  onChange={v => setConfig({ ...config, aiCount: v })}
                />
                <div className="mt-2 flex items-center gap-1" aria-hidden>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 ring-2 ring-slate-950"><Users className="h-3 w-3" /></span>
                  {Array.from({ length: config.aiCount }).map((_, i) => (
                    <span key={i} className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-slate-300 ring-2 ring-slate-950"><Bot className="h-3 w-3" /></span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guest notice */}
      {isGuest && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-100">Drafting as a guest</p>
              <p className="text-xs text-amber-200/70">Progress is kept for 7 days on this browser. Log in to save decks to Sanctum and use them in games.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="/user/login?redirect=/draft/new" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-300">
              <LogIn className="h-4 w-4" /> Log in
            </a>
            <a href="/user/signup?redirect=/draft/new" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15">
              <UserPlus className="h-4 w-4" /> Sign up
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/5">
      <div className="text-xl font-bold tabular-nums text-white">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{children}</div>
}

function Stepper({
  label, hint, value, min, max, onChange,
}: { label: string; hint?: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center rounded-xl bg-slate-900/80 p-1 ring-1 ring-white/5">
        <button type="button" onClick={dec} disabled={value <= min} aria-label={`Decrease ${label}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30">
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center text-lg font-bold tabular-nums text-white">{value}</div>
        <button type="button" onClick={inc} disabled={value >= max} aria-label={`Increase ${label}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  )
}
