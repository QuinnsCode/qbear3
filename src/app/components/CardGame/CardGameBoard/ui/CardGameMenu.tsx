// @/app/components/CardGame/CardGameMenu.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Gamepad2, ChevronDown } from 'lucide-react'
import { restartCardGame } from '@/app/serverActions/cardGame/cardGameActions'
import { MenuItem } from './MenuItem'
import type { MenuItemConfig } from './MenuButton'

interface Props {
  cardGameId: string
  gameName: string
  initialThreadUrl?: string | null
  className?: string
  isSandbox?: boolean
}

export default function CardGameMenu({
  cardGameId,
  gameName,
  initialThreadUrl,
  className,
  isSandbox = false
}: Props) {
  // isExpanded: pill has been clicked and shows the game name + caret
  // isOpen: the dropdown list is visible
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [restartClickCount, setRestartClickCount] = useState(0)
  const [isRestarting, setIsRestarting] = useState(false)
  const [threadUrl, setThreadUrl] = useState<string | null>(initialThreadUrl || null)
  const [creatingThread, setCreatingThread] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Auto-collapse to the small gamepad+Game pill after 5 s of inactivity,
  // but only when expanded and the dropdown is closed.
  useEffect(() => {
    if (isExpanded && !isOpen) {
      const timer = setTimeout(() => setIsExpanded(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isExpanded, isOpen])

  // Close everything when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsExpanded(false)
      }
    }
    if (isExpanded || isOpen) {
      document.addEventListener('mousedown', handleOutside)
      document.addEventListener('touchstart', handleOutside)
      return () => {
        document.removeEventListener('mousedown', handleOutside)
        document.removeEventListener('touchstart', handleOutside)
      }
    }
  }, [isExpanded, isOpen])

  // Escape collapses everything
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') { setIsOpen(false); setIsExpanded(false) }
    }
    if (isExpanded || isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isExpanded, isOpen])

  // Clicking the gamepad icon: expand if collapsed, collapse if already expanded
  const handleGamepadClick = () => {
    if (!isExpanded) {
      setIsExpanded(true)
    } else {
      setIsOpen(false)
      setIsExpanded(false)
    }
  }

  // ── action handlers ──────────────────────────────────────────────────────

  const handleRestartClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    if (restartClickCount === 0) {
      setRestartClickCount(1)
      setTimeout(() => setRestartClickCount(0), 3000)
      return false // keep menu open for confirmation
    }
    setIsRestarting(true)
    restartCardGame(cardGameId)
      .then(() => window.location.reload())
      .catch((err) => {
        console.error('Failed to restart game:', err)
        alert('Failed to restart game. Please try again.')
        setIsRestarting(false)
        setRestartClickCount(0)
      })
  }

  const handleOpenDiscord = async () => {
    if (threadUrl) {
      window.open(threadUrl, '_blank', 'noopener,noreferrer')
      return
    }
    try {
      const { createThreadForGame } = await import('@/app/serverActions/discord/createThreadForGame')
      const result = await createThreadForGame(cardGameId, gameName, 'cardGame')
      if (!result.success) {
        alert(result.needsConnection
          ? 'Please connect your Discord account in Sanctum before creating a thread.'
          : 'Failed to create Discord thread. Please try again.')
        return
      }
      setThreadUrl(result.threadUrl || null)
      if (result.threadUrl) window.open(result.threadUrl, '_blank', 'noopener,noreferrer')
    } catch {
      alert('An error occurred while creating the Discord thread.')
    }
  }

  // ── menu items ───────────────────────────────────────────────────────────

  const menuItems: MenuItemConfig[] = [
    ...(isSandbox ? [{
      label: 'Sign In / Sign Up',
      icon: '🔐',
      onClick: () => { window.location.href = '/user/login' },
      separator: true,
    }] : []),
    {
      label: 'Copy Game Link',
      icon: '🔗',
      onClick: () => {
        navigator.clipboard.writeText(window.location.href)
        alert('Game link copied to clipboard!')
      },
    },
    {
      label: creatingThread ? '⏳ Creating Discord...' : threadUrl ? '💬 Open Discord' : 'Create Discord Thread',
      icon: creatingThread ? '⏳' : '💬',
      onClick: handleOpenDiscord,
      disabled: creatingThread,
      separator: !isSandbox,
    },
    ...(!isSandbox ? [{
      label: 'Return to Sanctum',
      icon: '🏰',
      onClick: () => { window.location.href = '/sanctum' },
      separator: true,
    }] : []),
    ...(!isSandbox ? [{
      label: isRestarting ? 'Restarting...' : restartClickCount === 1 ? '⚠️ Are You Sure?' : 'Restart Card Game',
      icon: restartClickCount === 1 ? '⚠️' : '🔄',
      onClick: (e: any) => handleRestartClick(e),
      disabled: isRestarting,
    }] : []),
  ]

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div ref={menuRef} className={`relative ${className || ''}`}>

      {/* Pill trigger */}
      <div
        className="flex items-center bg-black/80 backdrop-blur-sm border border-slate-700 rounded-full shadow-lg transition-all duration-300"
        style={{
          boxShadow: isOpen
            ? '0 0 15px rgba(168, 85, 247, 0.35)'
            : '0 0 8px rgba(168, 85, 247, 0.15)',
        }}
      >
        {/* Gamepad icon — always present.
            Collapsed: shows icon + "Game" label.
            Expanded:  shows icon only; clicking it collapses the pill. */}
        <button
          onClick={handleGamepadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-white hover:text-purple-400 transition-colors"
          title={isExpanded ? 'Collapse' : 'Game menu'}
        >
          <Gamepad2 className="w-4 h-4" />
          {!isExpanded && (
            <span className="text-xs font-semibold">Game</span>
          )}
        </button>

        {/* Expanded section: game name + chevron to open the dropdown */}
        {isExpanded && (
          <button
            onClick={() => setIsOpen(o => !o)}
            className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 text-white hover:text-purple-400 transition-colors border-l border-slate-700"
          >
            <span className="text-xs font-semibold max-w-[140px] truncate">
              {gameName}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-50 py-1">
          {menuItems.map((item, i) => (
            <div key={i}>
              {item.disabled ? (
                <div className="px-3 py-2 text-sm text-gray-500 opacity-50 cursor-not-allowed flex items-center gap-2">
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                </div>
              ) : (
                <MenuItem
                  onClick={(e) => {
                    const result = item.onClick(e)
                    if (result !== false) setIsOpen(false)
                  }}
                >
                  <div className="flex items-center gap-2 py-0.5">
                    {item.icon && <span>{item.icon}</span>}
                    <span>{item.label}</span>
                  </div>
                </MenuItem>
              )}
              {item.separator && i < menuItems.length - 1 && (
                <div className="my-1 border-t border-slate-600" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
