// app/components/Draft/DraftContent.tsx
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Eye, Settings, AlertTriangle, Hourglass, Sparkles, Wifi, WifiOff, RotateCw,
  PartyPopper, Library, Pencil, Plus, Download, LogIn, UserPlus, PanelRightOpen,
} from 'lucide-react'
import { useDraftSync } from '@/app/hooks/draft/useDraftSync'
import PackDisplay from './PackDisplay'
import DraftPool from './DraftPool'
import DraftProgress from './DraftProgress'
import DraftDeckBuilderModal from './DraftDeckBuilderModal'
import DraftAuthBanner from './DraftAuthBanner'
import DraftSettingsModal from './DraftSettingsModal'
import MobileDraftTabs, { type DraftTab } from './MobileDraftTabs'
import DragHandle from '../CardGame/CardGameBoard/ui/DragHandle'
import type { CubeCard, DraftState } from '@/app/types/Draft'
import { makePick as makePickAction } from '@/app/serverActions/draft/makePick'
import { exportDraftDeck } from '@/app/serverActions/draft/exportDraftDeck'
import { exportPvpDeck } from '@/app/serverActions/draft/exportPvpDeck'
import { updateDraftPermissions } from '@/app/serverActions/draft/updateDraftPermissions'
import type { Region } from '@/app/lib/constants/regions'

interface Props {
  draftId: string
  initialState: DraftState
  userId: string
  userName: string
  isLoggedIn: boolean
  pvpRegion?: Region
  returnTo?: string
}

export default function DraftContent({
  draftId,
  initialState,
  userId,
  userName,
  isLoggedIn,
  pvpRegion,
  returnTo
}: Props) {
  const { draftState, isConnected, error, mode, focusedPlayerId, utils } = useDraftSync({
    draftId,
    initialState,
    currentPlayerId: userId,
    onError: (err) => console.error('Draft error:', err)
  })

  // Spectator mode - determine which player we're viewing
  const isSpectator = mode === 'spectator'
  const viewingPlayerId = isSpectator && focusedPlayerId ? focusedPlayerId : userId
  const viewingPlayer = draftState.players.find(p => p.id === viewingPlayerId)

  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [showDeckBuilder, setShowDeckBuilder] = useState(false)
  const [showReconnecting, setShowReconnecting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isPicking, setIsPicking] = useState(false)

  const isCreator = draftState.creatorId === userId

  // Sideboard state - persisted to localStorage
  const [sideboardCards, setSideboardCards] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(`draft:${draftId}:sideboard`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`draft:${draftId}:sideboard`, JSON.stringify(sideboardCards))
    } catch (error) {
      console.error('Failed to save sideboard:', error)
    }
  }, [sideboardCards, draftId])

  // Mobile state
  const [isMobile, setIsMobile] = useState(false)
  const [mobileTab, setMobileTab] = useState<DraftTab>('pack')

  // Desktop drag state - persisted to localStorage
  const [poolWidth, setPoolWidth] = useState(() => {
    if (typeof window === 'undefined') return 340
    try {
      const stored = localStorage.getItem('draft:poolWidth')
      return stored ? parseInt(stored) : 340
    } catch {
      return 340
    }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isPoolCollapsed, setIsPoolCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem('draft:poolCollapsed') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try { localStorage.setItem('draft:poolWidth', poolWidth.toString()) } catch {}
  }, [poolWidth])

  useEffect(() => {
    try { localStorage.setItem('draft:poolCollapsed', isPoolCollapsed.toString()) } catch {}
  }, [isPoolCollapsed])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      setPoolWidth(Math.max(260, Math.min(640, newWidth)))
      if (newWidth < 100) {
        setIsPoolCollapsed(true)
        setIsDragging(false)
      }
    }
    const handleMouseUp = () => setIsDragging(false)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (!isConnected) {
      timeout = setTimeout(() => setShowReconnecting(true), 2000)
    } else {
      setShowReconnecting(false)
    }
    return () => clearTimeout(timeout)
  }, [isConnected])

  // Set guest cookie
  useEffect(() => {
    if (!isLoggedIn) {
      const cookieName = `draft_user_${draftId}`
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7)
      document.cookie = `${cookieName}=${userId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`
    }
  }, [userId, draftId, isLoggedIn])

  const currentPlayer = draftState?.players?.find(p => p.id === userId)

  const handleMoveToSideboard = (cardId: string) => setSideboardCards(prev => [...prev, cardId])
  const handleMoveToMainDeck = (cardId: string) => setSideboardCards(prev => prev.filter(id => id !== cardId))
  const handleClearSideboard = () => setSideboardCards([])

  // Memoized so DraftPool's fetch effect is not re-triggered by every
  // WebSocket state update that leaves the pool unchanged.
  const draftPool = currentPlayer?.draftPool
  const mainDeckCards = useMemo(
    () => draftPool?.filter(cardId => !sideboardCards.includes(cardId)) || [],
    [draftPool, sideboardCards]
  )

  // Export deck to text (for guest users)
  const handleExportDeck = async () => {
    if (!currentPlayer) return

    const pool = currentPlayer.draftPool
    const cubeCards = draftState.cubeCards || []
    const cardsByName: Record<string, number> = {}

    const mainCards = pool.filter(id => !sideboardCards.includes(id))
    mainCards.forEach(scryfallId => {
      const card = cubeCards.find(c => c.scryfallId === scryfallId)
      if (card) cardsByName[card.name] = (cardsByName[card.name] || 0) + 1
    })

    const lines = Object.entries(cardsByName)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => `${count} ${name}`)

    const sideboardLines: string[] = []
    if (sideboardCards.length > 0) {
      const sideboardByName: Record<string, number> = {}
      sideboardCards.forEach(scryfallId => {
        const card = cubeCards.find(c => c.scryfallId === scryfallId)
        if (card) sideboardByName[card.name] = (sideboardByName[card.name] || 0) + 1
      })
      sideboardLines.push('', 'Sideboard:')
      sideboardLines.push(...Object.entries(sideboardByName)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, count]) => `${count} ${name}`))
    }

    const text = [
      `# Draft Pool - ${userName}`,
      `# Draft ID: ${draftId}`,
      `# Main Deck: ${mainCards.length}`,
      `# Sideboard: ${sideboardCards.length}`,
      `# Total Cards: ${pool.length}`,
      `# Date: ${new Date().toLocaleDateString()}`,
      '',
      '# To import later: Log in and upload this file',
      '',
      ...lines,
      ...sideboardLines
    ].join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `draft-pool-${draftId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    try {
      await navigator.clipboard.writeText(text)
      alert('✅ Deck exported and copied to clipboard!\n\nSign in with eqosys to save it to your account.')
    } catch {
      alert('✅ Deck exported as file!')
    }
  }

  const currentPack = currentPlayer?.currentPack
  const pickCount = draftState.config.pickCount
  const isDraftComplete = draftState.status === 'complete'
  const hasBuiltDeck = currentPlayer?.deckConfiguration?.isFinalized
  const isAI = currentPlayer?.isAI
  const canConfirm = !isSpectator && !isPicking && selectedCards.length === pickCount

  const handleCardClick = (cardId: string) => {
    if (isSpectator) return
    setSelectedCards(prev => {
      if (prev.includes(cardId)) return prev.filter(id => id !== cardId)
      if (prev.length < pickCount) return [...prev, cardId]
      // Replace the oldest selection so a single pick feels like a radio choice
      return [...prev.slice(1), cardId]
    })
  }

  const handleConfirmPick = useCallback(async () => {
    if (isSpectator) return
    if (selectedCards.length !== pickCount || isPicking) return
    setIsPicking(true)
    try {
      const result = await makePickAction(draftId, selectedCards, userId)
      if (result.success) {
        setSelectedCards([])
        if (isMobile) setMobileTab('pack')
      } else {
        alert('Failed to make pick: ' + result.error)
      }
    } finally {
      setIsPicking(false)
    }
  }, [isSpectator, selectedCards, pickCount, isPicking, draftId, userId, isMobile])

  // Enter confirms a complete selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (showSettings || showDeckBuilder) return
      if (canConfirm) handleConfirmPick()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canConfirm, handleConfirmPick, showSettings, showDeckBuilder])

  const handleFinalizeDeck = async (deckConfig: {
    mainDeck: Array<{ scryfallId: string; quantity: number }>
    sideboard: Array<{ scryfallId: string; quantity: number }>
    basics: Record<'W' | 'U' | 'B' | 'R' | 'G', number>
  }) => {
    try {
      const result = pvpRegion
        ? await exportPvpDeck(draftId, userId, deckConfig, pvpRegion)
        : await exportDraftDeck(draftId, userId, deckConfig)

      const resultError = 'error' in result ? result.error : undefined
      if (!result.success) {
        if (resultError?.includes('10 draft decks') || resultError?.includes('draft deck')) {
          const shouldDelete = confirm(
            '⚠️ You have reached the 10 draft deck limit.\n\n' +
            'Would you like to delete your oldest draft deck to make room?\n\n' +
            '(You can also go to the deck builder and manually delete decks you don\'t need)'
          )

          if (shouldDelete) {
            try {
              const { getUserDecks, deleteDeck } = await import('@/app/serverActions/deckBuilder/deckActions')
              const decksResult = await getUserDecks(userId)

              if (decksResult.success && decksResult.decks.length > 0) {
                const draftDecks = decksResult.decks
                  .filter(d => d.format?.toLowerCase() === 'draft')
                  .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())

                if (draftDecks.length > 0) {
                  const oldestDeck = draftDecks[0]
                  const deleteResult = await deleteDeck(userId, oldestDeck.id)

                  if (deleteResult.success) {
                    alert(`✅ Deleted oldest draft deck: "${oldestDeck.name}"\n\nNow saving your new deck...`)
                    const retryResult = pvpRegion
                      ? await exportPvpDeck(draftId, userId, deckConfig, pvpRegion)
                      : await exportDraftDeck(draftId, userId, deckConfig)
                    if (!retryResult.success) {
                      throw new Error(('error' in retryResult ? retryResult.error : undefined) || 'Failed to export deck after deletion')
                    }
                    setShowDeckBuilder(false)
                    return
                  } else {
                    throw new Error(deleteResult.error || 'Failed to delete old deck')
                  }
                } else {
                  throw new Error('No draft decks found to delete')
                }
              } else {
                throw new Error('Failed to fetch decks')
              }
            } catch (cleanupError) {
              console.error('Failed to cleanup old decks:', cleanupError)
              alert(`Failed to delete old deck: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}\n\nPlease go to the deck builder and delete one manually.`)
              return
            }
          } else {
            const goToDecks = confirm(
              'No problem! Would you like to go to the deck builder to manage your decks?\n\n' +
              '(Your draft progress is saved - you can come back and build this deck later)'
            )
            if (goToDecks) window.location.href = '/'
            return
          }
        }

        throw new Error(resultError || 'Failed to export deck')
      }

      try { localStorage.removeItem(`draft:${draftId}:sideboard`) } catch {}
      setShowDeckBuilder(false)

      if (pvpRegion && returnTo && result.deckId) {
        setTimeout(() => {
          window.location.href = `${returnTo}?deckId=${result.deckId}`
        }, 500)
      }
    } catch (error) {
      console.error('❌ Failed to export deck:', error)
      alert(`Failed to export deck: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  const handleUpdatePermissions = async (permissions: {
    isPublic?: boolean
    allowSpectators?: boolean
    spectatorList?: string[]
  }) => {
    const result = await updateDraftPermissions(draftId, userId, permissions)
    if (!result.success) throw new Error(result.error || 'Failed to update permissions')
  }

  /* ───────────────────────── Reconnecting ───────────────────────── */
  if (showReconnecting) {
    return (
      <div className="draft-arena flex min-h-screen items-center justify-center p-6 text-slate-100">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/30">
            <WifiOff className="h-6 w-6 text-rose-300" />
          </div>
          <h2 className="text-xl font-bold">Reconnecting…</h2>
          <p className="mt-1 text-sm text-slate-400">{error || 'Connection lost. Trying to get you back to the table.'}</p>
          <button
            onClick={() => { utils.clearError(); utils.reconnect() }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-300"
          >
            <RotateCw className="h-4 w-4" />
            Retry now
          </button>
        </div>
      </div>
    )
  }

  /* ───────────────────────── Starting ───────────────────────── */
  if (draftState?.status === 'waiting') {
    const open = draftState.players.filter(p => p.open).length
    const joinUrl = `${typeof window === 'undefined' ? '' : window.location.origin}/draft/${draftId}/join`
    return (
      <div className="draft-arena flex min-h-screen items-center justify-center p-6 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur">
          <h1 className="text-xl font-bold">Waiting for {open} more drafter{open === 1 ? '' : 's'}</h1>
          <p className="mt-2 text-sm text-slate-400">Send them this link. The draft starts when the last seat is taken.</p>
          <input readOnly value={joinUrl} onFocus={e => e.currentTarget.select()} className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm" />
          <a href={`/draft/${draftId}/join`} className="mt-4 inline-block text-sm text-amber-300 hover:underline">Take a seat yourself</a>
        </div>
      </div>
    )
  }

  if (!currentPlayer) {
    return (
      <div className="draft-arena flex min-h-screen items-center justify-center p-6 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 ring-1 ring-amber-400/30">
              <Sparkles className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Shuffling packs…</h1>
              <p className="text-sm text-slate-400">Seating {draftState?.players?.length ?? 0} drafters · {draftState?.status}</p>
            </div>
          </div>
          <div className="space-y-3">
            {[0.9, 0.7, 0.5].map((w, i) => (
              <div key={i} className="draft-shimmer h-3 rounded-full" style={{ width: `${w * 100}%` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ───────────────────────── Complete ───────────────────────── */
  if (isDraftComplete && !isAI) {
    if (!hasBuiltDeck) {
      return (
        <div className="draft-arena flex min-h-screen flex-col text-slate-100">
          <DraftAuthBanner isLoggedIn={isLoggedIn} userName={userName} onExportDeck={handleExportDeck} />

          <div className="flex flex-1 items-start justify-center p-4 md:p-8">
            <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl backdrop-blur">
              <div className="relative border-b border-white/5 bg-gradient-to-r from-amber-500/15 via-transparent to-indigo-500/10 px-6 py-8 text-center md:px-10">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 ring-1 ring-amber-400/40">
                  <PartyPopper className="h-7 w-7 text-amber-300" />
                </div>
                <h2 className="text-3xl font-bold">Draft complete</h2>
                <p className="mt-1 text-slate-400">
                  You drafted <span className="font-semibold text-slate-100">{currentPlayer.draftPool.length}</span> cards. Time to build a 40-card deck.
                </p>

                <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
                  {isLoggedIn ? (
                    <>
                      <button
                        onClick={() => setShowDeckBuilder(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 hover:bg-amber-300"
                      >
                        <Pencil className="h-5 w-5" />
                        Build your deck
                      </button>
                      <p className="text-xs text-slate-500">Add basic lands, set a sideboard and save it to your decks.</p>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleExportDeck}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 hover:bg-amber-300"
                      >
                        <Download className="h-5 w-5" />
                        Export deck as text
                      </button>
                      <div className="flex justify-center gap-2">
                        <a href={`/user/login?redirect=/draft/${draftId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15">
                          <LogIn className="h-4 w-4" /> Log in to save
                        </a>
                        <a href={`/user/signup?redirect=/draft/${draftId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15">
                          <UserPlus className="h-4 w-4" /> Sign up
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="max-h-[52vh] overflow-hidden">
                <DraftPool
                  cards={currentPlayer.draftPool}
                  draftId={draftId}
                  cubeCards={draftState.cubeCards}
                  compact
                  showDeckCounter={false}
                />
              </div>
            </div>
          </div>

          {showDeckBuilder && isLoggedIn && (
            <DraftDeckBuilderModal
              draftId={draftId}
              draftPool={currentPlayer.draftPool}
              cubeCards={draftState.cubeCards || []}
              playerId={userId}
              playerName={userName}
              onClose={() => setShowDeckBuilder(false)}
              onFinalize={handleFinalizeDeck}
              finalizeLabel="Finalize Deck"
              initialConfig={currentPlayer.deckConfiguration}
            />
          )}
        </div>
      )
    }

    return (
      <div className="draft-arena flex min-h-screen flex-col text-slate-100">
        <DraftAuthBanner isLoggedIn={isLoggedIn} userName={userName} onExportDeck={handleExportDeck} />

        <div className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-center shadow-2xl backdrop-blur">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400/10 ring-1 ring-emerald-400/40">
              <PartyPopper className="h-8 w-8 text-emerald-300" />
            </div>
            <h2 className="text-2xl font-bold">Deck saved</h2>
            <p className="mt-1 text-sm text-slate-400">
              Your {currentPlayer.deckConfiguration?.totalCards}-card draft deck is saved to your decks.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <a href="/" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 transition-colors hover:bg-amber-300">
                <Library className="h-5 w-5" /> View decks
              </a>
              <button onClick={() => setShowDeckBuilder(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/15">
                <Pencil className="h-4 w-4" /> Edit deck
              </button>
              <a href="/draft/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-6 py-3 font-semibold text-slate-200 transition-colors hover:bg-white/10">
                <Plus className="h-4 w-4" /> Start a new draft
              </a>
            </div>
          </div>

          {showDeckBuilder && (
            <DraftDeckBuilderModal
              draftId={draftId}
              draftPool={currentPlayer.draftPool}
              cubeCards={draftState.cubeCards || []}
              playerId={userId}
              playerName={userName}
              onClose={() => setShowDeckBuilder(false)}
              onFinalize={handleFinalizeDeck}
              finalizeLabel="Finalize Deck"
              initialConfig={currentPlayer.deckConfiguration}
            />
          )}
        </div>
      </div>
    )
  }

  /* ───────────────────────── In progress ───────────────────────── */
  const packKey = `${draftState.currentRound}-${draftState.currentPick}-${currentPack?.id ?? 'none'}`
  // The SSR snapshot carries raw card ids; the live socket sends full CubeCard objects.
  const cubeById = new Map((draftState.cubeCards || []).map(c => [c.scryfallId, c]))
  const packCards: CubeCard[] = (currentPack?.cards || [])
    .map((entry: unknown) => (typeof entry === 'string' ? cubeById.get(entry) : (entry as CubeCard)))
    .filter((c): c is CubeCard => !!c && !!c.scryfallId)
  const humanCount = draftState.players.filter(p => !p.isAI).length
  const aiCount = draftState.players.length - humanCount

  const PickToolbar = ({ full }: { full?: boolean }) => (
    <div className={`flex items-center gap-3 ${full ? 'flex-col items-stretch' : 'justify-between'}`}>
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-white">
          Pick {pickCount} card{pickCount > 1 ? 's' : ''}
        </h2>
        <div className="flex items-center gap-1" aria-label={`${selectedCards.length} of ${pickCount} selected`}>
          {Array.from({ length: pickCount }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition-all ${i < selectedCards.length ? 'bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'bg-slate-700'}`}
            />
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={handleConfirmPick}
        disabled={!canConfirm}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
          isSpectator
            ? 'cursor-not-allowed bg-slate-800 text-slate-500'
            : canConfirm
              ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 hover:bg-amber-300'
              : 'cursor-not-allowed bg-slate-800/80 text-slate-500 ring-1 ring-white/5'
        }`}
      >
        {isSpectator ? (
          <><Eye className="h-4 w-4" /> Spectating</>
        ) : isPicking ? (
          <><RotateCw className="h-4 w-4 animate-spin" /> Locking in…</>
        ) : (
          <>
            Confirm pick
            <span className="rounded-md bg-black/15 px-1.5 py-0.5 text-[11px] tabular-nums">{selectedCards.length}/{pickCount}</span>
            {canConfirm && !isMobile && <kbd className="ml-1 hidden rounded border border-black/20 px-1 text-[10px] font-semibold sm:inline">↵</kbd>}
          </>
        )}
      </button>
    </div>
  )

  const WaitingState = () => (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="draft-float mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-400/10 ring-1 ring-indigo-400/30">
        <Hourglass className="h-7 w-7 text-indigo-300" />
      </div>
      <p className="text-lg font-semibold text-white">Waiting for the table…</p>
      <p className="mt-1 text-sm text-slate-400">Packs pass once everyone has picked.</p>
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-300" style={{ animationDelay: `${i * 200}ms` }} />
        ))}
      </div>
    </div>
  )

  const poolPanel = (
    <DraftPool
      cards={mainDeckCards}
      draftId={draftId}
      cubeCards={draftState.cubeCards}
      compact={!isMobile}
      sideboardCards={sideboardCards}
      onMoveToSideboard={handleMoveToSideboard}
      onMoveToMainDeck={handleMoveToMainDeck}
      onClearSideboard={handleClearSideboard}
      showDeckCounter
    />
  )

  return (
    <div className="draft-arena flex h-screen flex-col overflow-hidden text-slate-100">
      <DraftAuthBanner isLoggedIn={isLoggedIn} userName={userName} onExportDeck={handleExportDeck} />

      {/* Public Draft Warning */}
      {draftState.permissions?.isPublic && isCreator && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2">
          <div className="mx-auto flex max-w-7xl items-center gap-2 text-xs text-amber-100">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
            <span>This draft is public. Anyone with the link can watch your picks live.</span>
            <button onClick={() => setShowSettings(true)} className="ml-auto underline underline-offset-2 hover:text-white">Change</button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="z-30 border-b border-white/5 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300 ring-1 ring-amber-400/30">
                Vintage Cube
              </span>
              <h1 className="truncate text-lg font-bold leading-none text-white md:text-xl">Cube Draft</h1>
              <span className="hidden text-xs text-slate-500 sm:inline">· {humanCount} human{humanCount === 1 ? '' : 's'}, {aiCount} AI</span>
            </div>
            <div className="mt-2 max-w-sm">
              <DraftProgress
                round={draftState.currentRound + 1}
                pick={draftState.currentPick + 1}
                totalRounds={draftState.config.packsPerPlayer}
                totalPicks={draftState.config.packSize}
                compact
              />
            </div>
            {isSpectator && viewingPlayer && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2 py-0.5 text-xs text-sky-200 ring-1 ring-sky-400/30">
                <Eye className="h-3.5 w-3.5" />
                Spectating <span className="font-semibold text-white">{viewingPlayer.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-2 text-sm text-slate-200 ring-1 ring-white/5 transition-colors hover:bg-white/10"
                title="Draft settings"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ring-1 ${
                isConnected ? 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/30' : 'bg-rose-500/10 text-rose-200 ring-rose-400/30'
              }`}
            >
              {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isConnected ? 'Live' : 'Reconnecting'}</span>
            </div>
          </div>
        </div>
      </header>

      {isMobile && (
        <MobileDraftTabs
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          poolCount={mainDeckCards.length}
          sideboardCount={sideboardCards.length}
          packCount={currentPack?.cards.length}
        />
      )}

      {/* Content */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {isMobile ? (
          <div className="thin-scroll flex-1 overflow-y-auto">
            {mobileTab === 'pack' ? (
              currentPack ? (
                <div className="p-4">
                  <div className="sticky top-0 z-20 -mx-4 mb-4 bg-slate-950/80 px-4 py-3 backdrop-blur">
                    <PickToolbar full />
                  </div>
                  <PackDisplay
                    pack={packCards}
                    packKey={packKey}
                    selectedCards={selectedCards}
                    onCardClick={handleCardClick}
                    disabled={isSpectator}
                  />
                </div>
              ) : <WaitingState />
            ) : (
              <div className="h-full">{poolPanel}</div>
            )}
          </div>
        ) : (
          <>
            <div
              className="thin-scroll flex-1 overflow-y-auto p-6"
              style={{ marginRight: isPoolCollapsed ? 44 : poolWidth }}
            >
              <div className="mx-auto max-w-6xl">
                {currentPack ? (
                  <>
                    <div className="mb-5">
                      <PickToolbar />
                    </div>
                    <PackDisplay
                      pack={packCards}
                      packKey={packKey}
                      selectedCards={selectedCards}
                      onCardClick={handleCardClick}
                      disabled={isSpectator}
                    />
                  </>
                ) : <WaitingState />}
              </div>
            </div>

            {!isPoolCollapsed && (
              <div className="absolute bottom-0 right-0 top-0 z-40" style={{ width: `${poolWidth}px` }}>
                <div className="relative flex h-full">
                  <DragHandle
                    orientation="vertical"
                    onDragStart={(e) => { e.preventDefault(); setIsDragging(true) }}
                    isDragging={isDragging}
                    onCollapse={() => setIsPoolCollapsed(true)}
                    isCollapsed={false}
                  />
                  <div className="h-full flex-1 overflow-hidden border-l border-white/5 bg-slate-950/70 backdrop-blur">
                    {poolPanel}
                  </div>
                </div>
              </div>
            )}

            {isPoolCollapsed && (
              <button
                onClick={() => setIsPoolCollapsed(false)}
                className="group absolute bottom-0 right-0 top-0 z-40 flex w-11 flex-col items-center justify-center gap-3 border-l border-white/5 bg-slate-950/70 backdrop-blur transition-colors hover:bg-slate-900"
                title="Expand pool panel"
              >
                <PanelRightOpen className="h-4 w-4 text-slate-500 group-hover:text-amber-300" />
                <span className="rotate-180 text-xs text-slate-400 [writing-mode:vertical-lr] group-hover:text-white">
                  Pool · {mainDeckCards.length}
                </span>
                {sideboardCards.length > 0 && (
                  <span className="rotate-180 text-xs text-fuchsia-300 [writing-mode:vertical-lr]">Side · {sideboardCards.length}</span>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {draftState.permissions && (
        <DraftSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          draftId={draftId}
          isCreator={isCreator}
          currentPermissions={draftState.permissions}
          onUpdate={handleUpdatePermissions}
        />
      )}
    </div>
  )
}
