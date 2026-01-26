// app/components/CardGame/CardGameBoard/ui/DragHandle.tsx
'use client'

import { GripHorizontal, GripVertical, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'

interface DragHandleProps {
  orientation: 'horizontal' | 'vertical'
  onDragStart: (e: React.MouseEvent) => void
  isDragging: boolean
  containerHeight?: number
  onCollapse?: () => void
  onExpand?: () => void
  isCollapsed?: boolean
}

export default function DragHandle({ 
  orientation, 
  onDragStart, 
  isDragging,
  containerHeight = 0,
  onCollapse,
  onExpand,
  isCollapsed = false
}: DragHandleProps) {
  if (orientation === 'horizontal') {
    return (
      <div className="relative group">
        <div
          onMouseDown={onDragStart}
          className={`cursor-ns-resize h-2 w-full flex items-center justify-center relative z-50 hover:bg-blue-500/20 transition-colors ${
            isDragging ? 'bg-blue-500/30' : ''
          }`}
        >
          <div className="absolute inset-x-0 -top-1 -bottom-1" /> {/* Larger hit area */}
          <GripHorizontal className={`w-8 h-4 text-slate-500 group-hover:text-blue-400 transition-colors ${
            isDragging ? 'text-blue-400' : ''
          }`} />
        </div>
        
        {/* Collapse/Expand Buttons */}
        {(onCollapse || onExpand) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {!isCollapsed && onCollapse && (
              <button
                onClick={onCollapse}
                className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 hover:text-white transition-all"
                title="Collapse section"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
            )}
            {isCollapsed && onExpand && (
              <button
                onClick={onExpand}
                className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 hover:text-white transition-all"
                title="Expand section"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Vertical handle - scale down when container is small
  const shouldScale = containerHeight > 0 && containerHeight < 300
  const iconSize = shouldScale ? 'w-3 h-6' : 'w-4 h-8'
  const handleWidth = shouldScale ? 'w-1.5' : 'w-2'

  return (
    <div className="relative group h-full">
      <div
        onMouseDown={onDragStart}
        className={`cursor-ew-resize ${handleWidth} h-full flex items-center justify-center relative z-50 hover:bg-blue-500/20 transition-all ${
          isDragging ? 'bg-blue-500/30' : ''
        }`}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" /> {/* Larger hit area */}
        <GripVertical className={`${iconSize} text-slate-500 group-hover:text-blue-400 transition-all ${
          isDragging ? 'text-blue-400' : ''
        }`} />
      </div>
      
      {/* Collapse/Expand Buttons */}
      {(onCollapse || onExpand) && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
          {!isCollapsed && onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 hover:text-white transition-all"
              title="Collapse panel"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
          {isCollapsed && onExpand && (
            <button
              onClick={onExpand}
              className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 hover:text-white transition-all"
              title="Expand panel"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}