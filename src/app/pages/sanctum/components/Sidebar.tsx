// app/pages/sanctum/components/Sidebar.tsx
'use client'

import { Home, Package, Gamepad2, Dice6, Users, Swords, Megaphone, Settings, ChevronLeft, ChevronRight, X, LogOut } from 'lucide-react'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

export type Section = 'overview' | 'decks' | 'cardGames' | 'riskGames' | 'social' | 'pvp' | 'announcements' | 'settings'

const SECTIONS = [
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'decks', label: 'My Decks', icon: Package },
  { id: 'cardGames', label: 'Card Games', icon: Gamepad2 },
  { id: 'riskGames', label: 'Risk Games', icon: Dice6 },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'pvp', label: 'PVP Arena', icon: Swords },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

interface SidebarProps {
  activeSection: Section
  onSectionChange: (section: Section) => void
  organizationName?: string
  userName?: string
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({
  activeSection,
  onSectionChange,
  organizationName,
  userName,
  isMobileOpen = false,
  onMobileClose
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleSectionClick = (section: Section) => {
    onSectionChange(section)
    // Close mobile menu when selecting a section
    if (onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`bg-slate-800 border-r-2 border-slate-600 h-screen flex flex-col transition-all duration-300 z-50
          ${isCollapsed ? 'w-20' : 'w-64'}
          md:sticky md:top-0
          fixed top-0 left-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
      {/* Header */}
      <div className="p-6 border-b border-slate-600 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Sanctum</h1>
            {organizationName && (
              <p className="text-sm text-slate-400 mt-1">{organizationName}</p>
            )}
          </div>
        )}
        {isCollapsed && (
          <div className="text-2xl">🏰</div>
        )}

        {/* Mobile Close Button */}
        {!isCollapsed && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden text-gray-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {SECTIONS.map(section => {
            const Icon = section.icon
            const isActive = activeSection === section.id

            return (
              <li key={section.id}>
                <button
                  onClick={() => handleSectionClick(section.id as Section)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={isCollapsed ? section.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="font-medium">{section.label}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-600 space-y-2">
        {!isCollapsed && userName && (
          <div className="px-4 py-2 bg-slate-700/50 rounded text-sm text-slate-300">
            👤 {userName}
          </div>
        )}

        {!isCollapsed && (
          <a
            href="/"
            className="block text-center text-blue-400 hover:text-blue-300 text-sm py-2"
          >
            ← Return Home
          </a>
        )}

        <button
          onClick={async () => {
            await authClient.signOut();
            window.location.href = '/user/login';
          }}
          className={`w-full flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-800/60 text-red-300 hover:text-red-200 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
          title="Logout"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Logout</span>}
        </button>

        {/* Collapse Button - Desktop only */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex w-full items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
      </div>
    </>
  )
}
