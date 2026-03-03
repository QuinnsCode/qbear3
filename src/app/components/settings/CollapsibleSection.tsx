// CollapsibleSection.tsx - Reusable collapsible section for settings
'use client'

import { useState, ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  title: string
  description?: string
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export function CollapsibleSection({
  title,
  description,
  icon,
  defaultOpen = false,
  children
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-slate-800 rounded-lg border-2 border-slate-600 overflow-hidden">
      {/* Header - Clickable to toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="text-2xl">{icon}</div>
          )}
          <div className="text-left">
            <div className="font-semibold text-white text-lg">{title}</div>
            {description && (
              <div className="text-sm text-slate-400 mt-0.5">{description}</div>
            )}
          </div>
        </div>
        <div className="text-slate-400">
          {isOpen ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Content - Collapsible */}
      {isOpen && (
        <div className="border-t-2 border-slate-600 p-6">
          {children}
        </div>
      )}
    </div>
  )
}
